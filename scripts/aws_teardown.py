#!/usr/bin/env python3
"""
aws_teardown.py — safely delete AWS resources created by this project.

⚠️  THIS DELETES CLOUD RESOURCES. Deletion is IRREVERSIBLE.

Safety design:
  • DRY-RUN by default — it only PRINTS what it would delete.
  • Nothing is deleted unless you pass --execute AND type the confirmation phrase.
  • Scoped to ONE region and (by default) to resources tagged Project=<name>.
  • Use --all-in-region to ignore the tag filter (NOT recommended).

Recommended alternative for THIS project's infra:
      cd terraform && terraform destroy        # removes exactly what TF created

Credentials: uses the standard boto3 chain (env vars, ~/.aws/credentials, or an
AWS profile). It NEVER hard-codes keys. Set them up first, e.g.:
      set AWS_ACCESS_KEY_ID=...      &&  set AWS_SECRET_ACCESS_KEY=...
  or  aws configure

Usage:
  python aws_teardown.py                                 # dry-run, default region, project tag
  python aws_teardown.py --region us-east-1              # choose region
  python aws_teardown.py --project event-ticketing       # tag filter (Project=...)
  python aws_teardown.py --include-s3                     # also empty+delete tagged S3 buckets
  python aws_teardown.py --execute                        # actually delete (asks to confirm)
  python aws_teardown.py --all-in-region --execute        # delete ALL (no tag filter) — dangerous

Requires: pip install boto3
"""
import argparse
import sys
import time

try:
    import boto3
    from botocore.exceptions import ClientError, NoCredentialsError
except ImportError:
    sys.exit("boto3 is required:  pip install boto3")

CONFIRM_PHRASE = "DELETE MY AWS RESOURCES"


def tag_filters(project, all_in_region):
    """EC2 describe filters scoped to the project tag unless --all-in-region."""
    return [] if all_in_region else [{"Name": "tag:Project", "Values": [project]}]


def banner(args, account):
    scope = "ALL resources in region (NO tag filter)" if args.all_in_region \
        else f"resources tagged Project={args.project}"
    mode = "EXECUTE (will DELETE)" if args.execute else "DRY-RUN (no changes)"
    print("=" * 64)
    print(f"  AWS teardown — account {account}  region {args.region}")
    print(f"  Scope : {scope}")
    print(f"  Mode  : {mode}")
    print("=" * 64)


def confirm(args):
    if not args.execute:
        return False
    print("\n⚠️  You are about to PERMANENTLY DELETE the resources listed above.")
    typed = input(f'   Type exactly  "{CONFIRM_PHRASE}"  to proceed: ').strip()
    if typed != CONFIRM_PHRASE:
        print("   Confirmation did not match. Aborting — nothing deleted.")
        return False
    return True


def ec2_teardown(session, args, do_delete):
    ec2 = session.client("ec2")
    flt = tag_filters(args.project, args.all_in_region)

    # 1) Instances
    instances = []
    for r in ec2.describe_instances(Filters=flt).get("Reservations", []):
        for i in r["Instances"]:
            if i["State"]["Name"] not in ("terminated", "shutting-down"):
                instances.append(i["InstanceId"])
    print(f"\nEC2 instances to terminate ({len(instances)}): {instances or '-'}")
    if do_delete and instances:
        ec2.terminate_instances(InstanceIds=instances)
        print("   waiting for instances to terminate...")
        ec2.get_waiter("instance_terminated").wait(InstanceIds=instances)
        print("   terminated.")

    # 2) Volumes (available/unattached)
    vols = [v["VolumeId"] for v in ec2.describe_volumes(
        Filters=flt + [{"Name": "status", "Values": ["available"]}]).get("Volumes", [])]
    print(f"EBS volumes to delete ({len(vols)}): {vols or '-'}")
    if do_delete:
        for v in vols:
            try:
                ec2.delete_volume(VolumeId=v)
            except ClientError as e:
                print(f"   skip {v}: {e.response['Error']['Code']}")

    # 3) Security groups (non-default)
    sgs = [g for g in ec2.describe_security_groups(Filters=flt).get("SecurityGroups", [])
           if g["GroupName"] != "default"]
    print(f"Security groups to delete ({len(sgs)}): {[g['GroupId'] for g in sgs] or '-'}")
    if do_delete:
        # strip rules first to avoid inter-SG dependency errors, then delete
        for g in sgs:
            try:
                if g.get("IpPermissions"):
                    ec2.revoke_security_group_ingress(GroupId=g["GroupId"], IpPermissions=g["IpPermissions"])
                if g.get("IpPermissionsEgress"):
                    ec2.revoke_security_group_egress(GroupId=g["GroupId"], IpPermissions=g["IpPermissionsEgress"])
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
                        print(f"   skip {g['GroupId']}: {e.response['Error']['Code']}")
                        break

    # 4) Key pairs (only when project-scoped; account-wide key deletion is too broad)
    if not args.all_in_region:
        kps = [k["KeyName"] for k in ec2.describe_key_pairs(Filters=flt).get("KeyPairs", [])]
        print(f"Key pairs to delete ({len(kps)}): {kps or '-'}")
        if do_delete:
            for k in kps:
                try:
                    ec2.delete_key_pair(KeyName=k)
                except ClientError as e:
                    print(f"   skip {k}: {e.response['Error']['Code']}")


def s3_teardown(session, args, do_delete):
    if not args.include_s3:
        return
    s3 = session.resource("s3")
    client = session.client("s3")
    targets = []
    for b in client.list_buckets().get("Buckets", []):
        name = b["Name"]
        if args.all_in_region:
            targets.append(name)
        else:
            try:
                tags = {t["Key"]: t["Value"] for t in
                        client.get_bucket_tagging(Bucket=name).get("TagSet", [])}
                if tags.get("Project") == args.project:
                    targets.append(name)
            except ClientError:
                pass  # no tags -> skip in project mode
    print(f"\nS3 buckets to empty+delete ({len(targets)}): {targets or '-'}")
    if do_delete:
        for name in targets:
            bucket = s3.Bucket(name)
            try:
                bucket.object_versions.delete()   # handles versioned + plain objects
                bucket.delete()
                print(f"   deleted bucket {name}")
            except ClientError as e:
                print(f"   skip {name}: {e.response['Error']['Code']}")


def main():
    p = argparse.ArgumentParser(description="Safely tear down project AWS resources.")
    p.add_argument("--region", default="us-east-1")
    p.add_argument("--project", default="event-ticketing", help="Project tag value to scope to")
    p.add_argument("--all-in-region", action="store_true",
                   help="Ignore the Project tag and target ALL matching resources (DANGEROUS)")
    p.add_argument("--include-s3", action="store_true", help="Also empty+delete S3 buckets")
    p.add_argument("--execute", action="store_true", help="Actually delete (otherwise dry-run)")
    args = p.parse_args()

    try:
        session = boto3.Session(region_name=args.region)
        account = session.client("sts").get_caller_identity()["Account"]
    except (NoCredentialsError, ClientError) as e:
        sys.exit(f"AWS credentials/region problem: {e}")

    banner(args, account)

    # First pass: always print the plan (do_delete=False) so the user sees the list.
    ec2_teardown(session, args, do_delete=False)
    s3_teardown(session, args, do_delete=False)

    if confirm(args):
        print("\n--- DELETING ---")
        ec2_teardown(session, args, do_delete=True)
        s3_teardown(session, args, do_delete=True)
        print("\nDone.")
    else:
        print("\nDry-run only — nothing was deleted. Re-run with --execute to delete.")


if __name__ == "__main__":
    main()
