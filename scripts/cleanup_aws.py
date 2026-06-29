#!/usr/bin/env python3
"""
cleanup_aws.py — Destroy ALL event-ticketing AWS resources at once.

Usage:
    python scripts/cleanup_aws.py                  # dry-run
    python scripts/cleanup_aws.py --execute        # actually delete

Requires: pip install boto3, AWS credentials configured (aws configure).
"""
import argparse
import sys
import time

try:
    import boto3
    from botocore.exceptions import ClientError
except ImportError:
    sys.exit("boto3 required:  pip install boto3")

PROJECT_TAG = "event-ticketing"
STATE_BUCKET = "event-ticketing-terraform-state"
LOCK_TABLE = "event-ticketing-terraform-lock"


def log(verb, *items):
    print(f"[{verb:>8}]", *items)


def terminate_instances(ec2, do):
    ids = []
    for r in ec2.describe_instances(Filters=[{"Name": "tag:Project", "Values": [PROJECT_TAG]}]).get("Reservations", []):
        for i in r["Instances"]:
            if i["State"]["Name"] not in ("terminated", "shutting-down"):
                ids.append(i["InstanceId"])
    log("EC2", f"{len(ids)} instance(s):", ids or "none")
    if do and ids:
        ec2.terminate_instances(InstanceIds=ids)
        ec2.get_waiter("instance_terminated").wait(InstanceIds=ids)


def delete_volumes(ec2, do):
    vols = [v["VolumeId"] for v in ec2.describe_volumes(
        Filters=[{"Name": "tag:Project", "Values": [PROJECT_TAG]}, {"Name": "status", "Values": ["available"]}]
    ).get("Volumes", [])]
    log("EBS", f"{len(vols)} volume(s):", vols or "none")
    if do:
        for v in vols:
            try:
                ec2.delete_volume(VolumeId=v)
            except ClientError as e:
                log("skip", v, e.response["Error"]["Code"])


def delete_security_groups(ec2, do):
    sgs = [g for g in ec2.describe_security_groups(
        Filters=[{"Name": "tag:Project", "Values": [PROJECT_TAG]}]
    ).get("SecurityGroups", []) if g["GroupName"] != "default"]
    log("SG", f"{len(sgs)} group(s):", [g["GroupId"] for g in sgs] or "none")
    if do:
        for g in sgs:
            for r in [g.get("IpPermissions", []), g.get("IpPermissionsEgress", [])]:
                try:
                    ec2.revoke_security_group_ingress(GroupId=g["GroupId"], IpPermissions=r) if r else None
                except ClientError:
                    pass
        for g in sgs:
            for attempt in range(3):
                try:
                    ec2.delete_security_group(GroupId=g["GroupId"])
                    break
                except ClientError as e:
                    if e.response["Error"]["Code"] == "DependencyViolation" and attempt < 2:
                        time.sleep(5)
                    else:
                        log("skip", g["GroupId"], e.response["Error"]["Code"])
                        break


def delete_key_pairs(ec2, do):
    kps = [k["KeyName"] for k in ec2.describe_key_pairs(
        Filters=[{"Name": "tag:Project", "Values": [PROJECT_TAG]}]
    ).get("KeyPairs", [])]
    log("KEY", f"{len(kps)} pair(s):", kps or "none")
    if do:
        for k in kps:
            try:
                ec2.delete_key_pair(KeyName=k)
            except ClientError as e:
                log("skip", k, e.response["Error"]["Code"])


def delete_s3_buckets(s3, s3_client, do):
    targets = []
    for b in s3_client.list_buckets().get("Buckets", []):
        name = b["Name"]
        if name == STATE_BUCKET:
            targets.append(name)
            continue
        try:
            tags = {t["Key"]: t["Value"] for t in
                    s3_client.get_bucket_tagging(Bucket=name).get("TagSet", [])}
            if tags.get("Project") == PROJECT_TAG:
                targets.append(name)
        except ClientError:
            pass
    log("S3", f"{len(targets)} bucket(s):", targets or "none")
    if do:
        for name in targets:
            try:
                s3.Bucket(name).object_versions.delete()
                s3.Bucket(name).delete()
                log("DEL", "S3 bucket", name)
            except ClientError as e:
                log("skip", name, e.response["Error"]["Code"])


def delete_dynamodb_tables(dynamo, do):
    tables = [t for t in dynamo.list_tables().get("TableNames", []) if t == LOCK_TABLE]
    log("DDB", f"{len(tables)} table(s):", tables or "none")
    if do:
        for t in tables:
            try:
                dynamo.delete_table(TableName=t)
                dynamo.get_waiter("table_not_exists").wait(TableName=t)
                log("DEL", "DynamoDB table", t)
            except ClientError as e:
                log("skip", t, e.response["Error"]["Code"])


def main():
    p = argparse.ArgumentParser(description="Destroy all event-ticketing AWS resources.")
    p.add_argument("--execute", action="store_true", help="Actually delete (default: dry-run)")
    args = p.parse_args()

    try:
        session = boto3.Session(region_name="us-east-1")
        account = session.client("sts").get_caller_identity()["Account"]
    except Exception as e:
        sys.exit(f"AWS credentials error: {e}")

    tag = "event-ticketing"
    mode = "EXECUTE" if args.execute else "DRY-RUN"
    print(f"Account {account} | us-east-1 | Project={tag} | Mode: {mode}")
    print("=" * 60)

    ec2 = session.client("ec2")
    s3 = session.resource("s3")
    s3_client = session.client("s3")
    dynamo = session.client("dynamodb")

    terminate_instances(ec2, args.execute)
    delete_volumes(ec2, args.execute)
    delete_security_groups(ec2, args.execute)
    delete_key_pairs(ec2, args.execute)
    delete_s3_buckets(s3, s3_client, args.execute)
    delete_dynamodb_tables(dynamo, args.execute)

    if not args.execute:
        print("\nDry-run complete. Re-run with --execute to delete everything.")
    else:
        print("\nCleanup complete.")


if __name__ == "__main__":
    main()
