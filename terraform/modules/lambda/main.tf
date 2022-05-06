resource "aws_ecr_repository" "default" {
  name                 = var.app_name
  image_tag_mutability = "IMMUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }
}

resource "aws_lambda_function" "default" {
  function_name = var.app_name
  timeout = 900
  environment {
    variables = {
      API_ID = var.api_id
    }
  }

  package_type = "Image"
  image_uri = "${aws_ecr_repository.default.repository_url}:${var.tag}"

  role = var.lambda_role
  depends_on = [
    aws_ecr_repository.default,
    aws_cloudwatch_log_group.default
  ]
  publish = true
}

resource "aws_cloudwatch_log_group" "default" {
  name = "/aws/lambda/${var.app_name}"

  retention_in_days = 30
}