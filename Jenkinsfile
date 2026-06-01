pipeline {
  agent any

  options {
    timestamps()
    disableConcurrentBuilds()
    buildDiscarder(logRotator(numToKeepStr: '20'))
  }

  environment {
    IMAGE_TAG = "${env.BUILD_NUMBER}"
    IMAGE_REGISTRY = "local"
    COMPOSE_FILE = "docker-compose.prod.yml"
  }

  stages {
    stage('Verify Backend') {
      steps {
        dir('safetynet-api') {
          sh 'chmod +x mvnw'
          sh './mvnw clean test package'
        }
      }
    }

    stage('Verify Frontend') {
      steps {
        dir('safetynet-ui') {
          sh 'npm ci'
          sh 'npm run build'
        }
      }
    }

    stage('Build Images') {
      steps {
        sh 'docker compose -f $COMPOSE_FILE build api ui'
      }
    }

    stage('Deploy') {
      when {
        expression { return !env.BRANCH_NAME || env.BRANCH_NAME == 'main' }
      }
      steps {
        sh 'docker compose -f $COMPOSE_FILE up -d --remove-orphans'
      }
    }
  }

  post {
    always {
      sh 'docker compose -f $COMPOSE_FILE ps || true'
    }
  }
}
