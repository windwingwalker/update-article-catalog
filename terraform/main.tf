terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 3.48.0"
    }
  }
 
  required_version = "~> 1.0"
}

provider "aws" {
  region = var.aws_region
  default_tags {
    tags = {
      "app" = "article"
    }
  }
}

module "lambda" {
  source = "./modules/lambda/"
  app_name = var.app_name
  lambda_role = var.lambda_role
  tag = var.tag
  api_id = var.api_id
}

module "eventbridge" {
  source = "./modules/eventbridge"
  app_name = var.app_name
  function_arn = module.lambda.function_arn
}
