@Library('ci-shared-library') _

// Single-stack web repo (menu + one folder per game + shared/, one multi-page Vite build): same shape as
// PollDrop's Jenkinsfile.ui, run from the repo root.
pipeline {
    agent any
    options {
        timeout(time: 20, unit: 'MINUTES')
        timestamps()
        ansiColor('xterm')
    }
    environment {
        CACHE_KEY = "${env.JOB_NAME}".replaceAll(/[^a-zA-Z0-9_.-]/, '-')
    }
    stages {
        stage('Install, lint, test, build, analyze') {
            steps {
                script {
                    docker.image('node:22-bookworm-slim').inside(
                        "--network ci-internal -v npm-cache-${env.CACHE_KEY}:/root/.npm"
                    ) {
                        sh 'npm ci'
                        sh 'npm run lint'
                        sh 'npx vitest run --coverage --reporter=junit --outputFile=test-results/junit.xml'
                        sh 'npm run build'
                    }
                    runSonarAnalysis {
                        docker.image('sonarsource/sonar-scanner-cli:latest').inside('--network ci-internal') {
                            sh 'sonar-scanner -Dsonar.projectKey=arcade -Dsonar.projectName=Arcade ' +
                               '-Dsonar.sources=. -Dsonar.inclusions=*/src/**,*/index.html,index.html,menu.css -Dsonar.exclusions=**/*.test.ts,node_modules/**,dist/** ' +
                               '-Dsonar.coverage.exclusions=*/src/main.ts,*/src/render.ts,**/*.css,**/*.html ' +
                               '-Dsonar.javascript.lcov.reportPaths=coverage/lcov.info'
                        }
                    }
                    enforceQualityGate()
                }
            }
        }
        stage('Secret + dependency scan') {
            steps {
                script {
                    secretAndDependencyScan()
                }
            }
        }
    }
    post {
        always {
            publishJUnitResults(pattern: 'test-results/junit.xml')
            archiveArtifacts artifacts: 'gitleaks-report.json,trivy-report.json', allowEmptyArchive: true
            cleanWorkspace()
        }
    }
}
