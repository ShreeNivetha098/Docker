// Local CI/CD demo. Start each run with "Build Now" unless you enable polling.
// macOS and Linux agents use sh. A Windows agent uses bat.
// Docker Desktop must already be running, and node, npm, and docker must be on PATH.

pipeline {
    agent any

    environment {
        IMAGE_NAME = 'cicd-pipeline-demo'
        CONTAINER_NAME = 'cicd-pipeline-demo'
        APP_PORT = '3000'
    }

    options {
        disableConcurrentBuilds()
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
                echo 'SUCCESS: Checkout retrieved the source code from Git.'
            }
        }

        stage('Install Dependencies') {
            steps {
                script {
                    if (isUnix()) {
                        sh 'npm ci'
                    } else {
                        bat 'npm ci'
                    }
                }
                echo 'SUCCESS: Application dependencies are installed.'
            }
        }

        stage('Test') {
            steps {
                script {
                    if (isUnix()) {
                        sh 'npm test'
                    } else {
                        bat 'npm test'
                    }
                }
                echo 'SUCCESS: Automated tests passed.'
            }
        }

        stage('Build') {
            steps {
                script {
                    if (isUnix()) {
                        sh 'docker build -t ${IMAGE_NAME}:${BUILD_NUMBER} -t ${IMAGE_NAME}:latest .'
                    } else {
                        bat 'docker build -t %IMAGE_NAME%:%BUILD_NUMBER% -t %IMAGE_NAME%:latest .'
                    }
                }
                echo 'SUCCESS: Docker image built.'
            }
        }

        stage('Deploy') {
            steps {
                script {
                    if (isUnix()) {
                        sh '''
                            docker stop ${CONTAINER_NAME} || true
                            docker rm ${CONTAINER_NAME} || true
                            docker run -d --name ${CONTAINER_NAME} -p ${APP_PORT}:${APP_PORT} ${IMAGE_NAME}:${BUILD_NUMBER}
                        '''
                    } else {
                        bat '''
                            docker stop %CONTAINER_NAME% || echo No previous container to stop.
                            docker rm %CONTAINER_NAME% || echo No previous container to remove.
                            docker run -d --name %CONTAINER_NAME% -p %APP_PORT%:%APP_PORT% %IMAGE_NAME%:%BUILD_NUMBER%
                        '''
                    }
                }
                echo 'SUCCESS: Previous container replaced with the new image.'
            }
        }

        stage('Verify') {
            steps {
                script {
                    if (isUnix()) {
                        sh 'node scripts/verify.js'
                    } else {
                        bat 'node scripts/verify.js'
                    }
                }
                echo 'SUCCESS: Deployed application responded on port 3000.'
            }
        }
    }

    post {
        success {
            echo 'PIPELINE SUCCESS: Open http://localhost:3000 in a browser.'
        }
        failure {
            echo 'PIPELINE FAILURE: A stage failed, so this run is not a successful deployment. Read the failed stage, fix the project, push the change, and run the job again.'
        }
    }
}
