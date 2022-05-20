pipeline{
  agent any
  environment {
    AWS_ACCESS_KEY_ID          = credentials('aws_access_key_id')
    AWS_SECRET_ACCESS_KEY      = credentials('aws_secret_access_key')
    AWS_ACCOUNT_ID             = credentials('aws_account_id')

    APP_NAME                   = "article"
    RESOURCE_NAME              = "article-catalog"
    MS_NAME                    = "update-article-catalog"

    TF_VAR_tag                 = "${env.BUILD_NUMBER}"
    TF_VAR_app_name            = "${APP_NAME}"
    TF_VAR_resource_name       = "${RESOURCE_NAME}"
    TF_VAR_ms_name             = "${MS_NAME}"
  }
  tools {
    terraform 'TerraformDefault'
  }
  options {
    ansiColor('xterm')
  }
  stages{
    stage('Compile'){
      agent {
        docker {
          image 'node:14-buster'
          reuseNode true
        }
      }
      steps{
        dir('dist'){}
        sh 'npm install'
        sh 'npm run build'
        stash includes: 'dist/**/*', name: 'distJs'
      }
    }
    stage('Build Image'){
      steps{
        sh 'ls -al'
        dir('dist'){
          unstash 'distJs'
        }
        script{
          image = docker.build("${AWS_ACCOUNT_ID}.dkr.ecr.us-east-1.amazonaws.com/${MS_NAME}:${TF_VAR_tag}")
        }
      }
    }
    stage('Push Image'){
      steps{
        script{
          docker.withRegistry("https://${AWS_ACCOUNT_ID}.dkr.ecr.us-east-1.amazonaws.com", "ecr:us-east-1:aws_credentials") {
            image.push()
          }
        }
      }
    }
    stage('Deploy'){
      steps{
        dir('terraform'){
          sh 'terraform init -input=false'
          sh 'terraform plan -out=tfplan -input=false'
          sh 'terraform apply -input=false -auto-approve tfplan'
        }
        sh 'rm -rf dist/' 
      }
    }
  }
}