# ─────────────────────────────────────────────
# MongoDB Node Outputs
# ─────────────────────────────────────────────

output "mongodb_instance_id" {
  description = "EC2 instance ID of the MongoDB node"
  value       = aws_instance.mongodb.id
}

output "mongodb_public_ip" {
  description = "Public IP address of the MongoDB node"
  value       = aws_instance.mongodb.public_ip
}

output "mongodb_private_ip" {
  description = "Private IP address of the MongoDB node (used by the App node)"
  value       = aws_instance.mongodb.private_ip
}

output "mongodb_public_dns" {
  description = "Public DNS hostname of the MongoDB node"
  value       = aws_instance.mongodb.public_dns
}

output "mongodb_connection_string" {
  description = "MongoDB connection string (from the App node)"
  value       = "mongodb://${aws_instance.mongodb.private_ip}:27017"
}

# ─────────────────────────────────────────────
# App Node Outputs
# ─────────────────────────────────────────────

output "app_instance_id" {
  description = "EC2 instance ID of the App node"
  value       = aws_instance.app.id
}

output "app_public_ip" {
  description = "Public IP address of the App node"
  value       = aws_instance.app.public_ip
}

output "app_private_ip" {
  description = "Private IP address of the App node"
  value       = aws_instance.app.private_ip
}

output "app_public_dns" {
  description = "Public DNS hostname of the App node"
  value       = aws_instance.app.public_dns
}

output "app_url" {
  description = "URL to access the Node.js application"
  value       = "http://${aws_instance.app.public_ip}:3000"
}

# ─────────────────────────────────────────────
# Network Outputs
# ─────────────────────────────────────────────

output "vpc_id" {
  description = "ID of the VPC"
  value       = aws_vpc.main.id
}

output "public_subnet_id" {
  description = "ID of the public subnet"
  value       = aws_subnet.public.id
}

output "ssh_mongodb" {
  description = "SSH command for the MongoDB node"
  value       = "ssh -i <your-key.pem> ubuntu@${aws_instance.mongodb.public_ip}"
}

output "ssh_app" {
  description = "SSH command for the App node"
  value       = "ssh -i <your-key.pem> ubuntu@${aws_instance.app.public_ip}"
}
