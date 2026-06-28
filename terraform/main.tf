terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
  }
}

resource "random_id" "suffix" {
  byte_length = 4
}

provider "aws" {
  region = var.aws_region
}

# ─── Data Sources ────────────────────────────────────────────────────────────

# Latest Amazon Linux 2023 AMI (free tier eligible, glibc 2.34 -- supports Node.js 20)
data "aws_ami" "amazon_linux_2" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["al2023-ami-2023*-x86_64"]
  }
  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
  filter {
    name   = "state"
    values = ["available"]
  }
}

# Use the default VPC (already exists in every AWS account)
data "aws_vpc" "default" {
  default = true
}

data "aws_subnets" "default" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.default.id]
  }
}

# ─── Security Group: MongoDB Server ──────────────────────────────────────────

resource "aws_security_group" "mongodb_sg" {
  name        = "${var.project_name}-mongodb-sg-${random_id.suffix.hex}"
  description = "Security group for MongoDB EC2 instance"
  vpc_id      = data.aws_vpc.default.id

  # SSH access for administration
  ingress {
    description = "SSH"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # Allow all outbound
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name    = "${var.project_name}-mongodb-sg-${random_id.suffix.hex}"
    Project = var.project_name
  }
}

# MongoDB port: app SG → MongoDB SG (separate rule to avoid circular dependency)
resource "aws_security_group_rule" "mongodb_from_app" {
  description              = "Allow MongoDB access from app server"
  type                     = "ingress"
  from_port                = 27017
  to_port                  = 27017
  protocol                 = "tcp"
  source_security_group_id = aws_security_group.app_sg.id
  security_group_id        = aws_security_group.mongodb_sg.id
}

# ─── Security Group: App Server ───────────────────────────────────────────────

resource "aws_security_group" "app_sg" {
  name        = "${var.project_name}-app-sg-${random_id.suffix.hex}"
  description = "Security group for App (Node.js + React) EC2 instance"
  vpc_id      = data.aws_vpc.default.id

  # SSH
  ingress {
    description = "SSH"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # HTTP
  ingress {
    description = "HTTP"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # HTTPS
  ingress {
    description = "HTTPS"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # Node.js / Express API
  ingress {
    description = "Node.js API"
    from_port   = 5000
    to_port     = 5000
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # Vite React dev server
  ingress {
    description = "Vite dev server"
    from_port   = 5173
    to_port     = 5173
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # Allow all outbound
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name    = "${var.project_name}-app-sg-${random_id.suffix.hex}"
    Project = var.project_name
  }
}

# ─── EC2 Instance 1: MongoDB Server ──────────────────────────────────────────

resource "aws_instance" "mongodb" {
  ami                    = data.aws_ami.amazon_linux_2.id
  instance_type          = "t2.micro"   # free tier
  key_name               = var.key_pair_name
  subnet_id              = tolist(data.aws_subnets.default.ids)[0]
  vpc_security_group_ids = [aws_security_group.mongodb_sg.id]

  # Bootstrap script installs + configures MongoDB 7.0
  user_data = templatefile("${path.module}/user_data/mongodb.sh", {
    mongo_user     = var.mongo_username
    mongo_password = var.mongo_password
    mongo_db       = var.mongo_database
  })

  root_block_device {
    volume_size           = 30      # GB — free tier allows up to 30 GB
    volume_type           = "gp2"
    delete_on_termination = true
  }

  tags = {
    Name        = "${var.project_name}-mongodb"
    Role        = "database"
    Project     = var.project_name
    Environment = var.environment
  }
}

# ─── EC2 Instance 2: App Server (Node.js + React + GitHub) ───────────────────

resource "aws_instance" "app" {
  ami                    = data.aws_ami.amazon_linux_2.id
  instance_type          = "t2.micro"   # free tier
  key_name               = var.key_pair_name
  subnet_id              = tolist(data.aws_subnets.default.ids)[0]
  vpc_security_group_ids = [aws_security_group.app_sg.id]

  # Bootstrap script installs Node.js, React build tools, GitHub CLI, PM2, nginx
  user_data = templatefile("${path.module}/user_data/app.sh", {
    mongodb_private_ip = aws_instance.mongodb.private_ip
    mongo_user         = var.mongo_username
    mongo_password     = var.mongo_password
    mongo_db           = var.mongo_database
    jwt_secret         = var.jwt_secret
    github_repo        = var.github_repo
    node_env           = var.environment
  })

  root_block_device {
    volume_size           = 30
    volume_type           = "gp2"
    delete_on_termination = true
  }

  # App server waits for MongoDB to be provisioned first
  depends_on = [aws_instance.mongodb]

  tags = {
    Name        = "${var.project_name}-app"
    Role        = "application"
    Project     = var.project_name
    Environment = var.environment
  }
}
