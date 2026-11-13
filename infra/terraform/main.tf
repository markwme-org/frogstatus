# DEMO SEED: deliberately misconfigured resources, used to demonstrate IaC scanning.
# Never apply. Applied/removed by scripts/demo-seed.sh.

resource "aws_s3_bucket" "artifacts" {
  bucket = "frogstatus-artifacts"
}

resource "aws_s3_bucket_acl" "artifacts" {
  bucket = aws_s3_bucket.artifacts.id
  acl    = "public-read"
}

resource "aws_db_instance" "db" {
  allocated_storage   = 10
  engine              = "mysql"
  instance_class      = "db.t3.micro"
  publicly_accessible = true
  storage_encrypted   = false
}
