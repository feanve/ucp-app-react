pipeline {
   agent any


   tools {
       nodejs 'Node_24'  // Configurado en Global Tool Configuration
   }
   environment {
        SONAR_PROJECT_KEY = 'ucp-app-react'
        SONAR_PROJECT_NAME = 'UCP React App'
    }

   stages {
       // Etapa 1: Checkout del fork (para que los cambios propios se prueben)
       stage('Checkout') {
           steps {
               git branch: 'main', url: 'https://github.com/feanve/ucp-app-react.git'
           }
       }

        // Etapa 2: Instalar dependencias y build del proyecto
       stage('Build') {
           steps {
               sh 'npm install'
               sh 'npm run build'
               sh 'npm run test:coverage' // Asegúrate de que tu package.json tenga este script
           }
       }
       
       // Escaneo de seguridad de dependencias con Snyk
       // Si hay vulnerabilidades de severidad alta o crítica, el build queda
       // UNSTABLE (no FAILURE) para que el pipeline continúe y deje el reporte
       stage('Security Scan with Snyk') {
           steps {
               catchError(buildResult: 'UNSTABLE', stageResult: 'UNSTABLE') {
                   snykSecurity(
                       snykInstallation: 'snyk@latest',  // Configurado en Tools
                       snykTokenId: 'SNYK_API_TOKEN',    // Credencial tipo "Snyk API token"
                       severity: 'high',                 // Umbral: solo high y critical cuentan como falla
                       failOnIssues: true
                   )
               }
           }
       }

       // Nueva etapa: Análisis de SonarQube
        stage('SonarQube Analysis') {
            steps {
                 script {
                    def scannerHome = tool 'MySonarQube'
                    withSonarQubeEnv('SonarQube') {
                        sh """
                            ${scannerHome}/bin/sonar-scanner \
                            -Dsonar.projectKey=${SONAR_PROJECT_KEY} \
                            -Dsonar.projectName='${SONAR_PROJECT_NAME}' \
                            -Dsonar.sources=src \
                            -Dsonar.javascript.lcov.reportPaths=coverage/lcov.info
                        """
                    }
                }
            }
        }

        stage('Quality Gate') {
            steps {
                timeout(time: 5, unit: 'MINUTES') {
                    waitForQualityGate abortPipeline: true
                }
            }
        }


       // Etapa 3: Pruebas paralelizadas (cada rama genera su propio reporte JUnit)
       stage('Pruebas en Paralelo') {
           parallel {
               // Pruebas en Chrome
               stage('Pruebas Chrome') {
                   environment {
                       JEST_JUNIT_OUTPUT_NAME = 'junit-chrome.xml'
                   }
                   steps {
                       script {
                           try {
                               sh 'npm test -- --browser=chrome --watchAll=false --ci --reporters=default --reporters=jest-junit'
                           } catch (err) {
                               echo "Pruebas en Chrome fallaron: ${err}"
                               currentBuild.result = 'UNSTABLE'
                           } finally {
                               junit allowEmptyResults: true, testResults: 'junit-chrome.xml'
                           }
                       }
                   }
               }


               // Pruebas en Firefox
               stage('Pruebas Firefox') {
                   environment {
                       JEST_JUNIT_OUTPUT_NAME = 'junit-firefox.xml'
                   }
                   steps {
                       script {
                           try {
                               sh 'npm test -- --browser=firefox --watchAll=false --ci --reporters=default --reporters=jest-junit'
                           } catch (err) {
                               echo "Pruebas en Firefox fallaron: ${err}"
                               currentBuild.result = 'UNSTABLE'
                           } finally {
                               junit allowEmptyResults: true, testResults: 'junit-firefox.xml'
                           }
                       }
                   }
               }
           }
       }


       // Etapa 4: Deploy simulado
       stage('Deploy a Producción (Simulado)') {
           steps {
               script {
                   // Crear carpeta "prod" y copiar build
                   sh 'mkdir -p prod && cp -r build/* prod/'
                   echo "¡Deploy simulado exitoso! Archivos copiados a /prod"
               }
           }
       }
   }


   post {
       always {
           // Publicar el build desplegado como reporte HTML
           publishHTML target: [
               allowMissing: true,
               alwaysLinkToLastBuild: true,
               keepAll: true,
               reportDir: 'prod',
               reportFiles: 'index.html',
               reportName: 'Demo Deploy'
           ]


           // Notificación por email (éxito, inestable o fallo)
           emailext (
               subject: "Pipeline ${currentBuild.currentResult}: ${env.JOB_NAME} #${env.BUILD_NUMBER}",
               body: """
                   <h2>Resultado: ${currentBuild.currentResult}</h2>
                   <p><b>URL del Build:</b> <a href="${env.BUILD_URL}">${env.BUILD_URL}</a></p>
                   <p><b>Pruebas:</b> <a href="${env.BUILD_URL}testReport/">Ver reporte JUnit</a></p>
                   <p><b>Consola:</b> <a href="${env.BUILD_URL}console">Ver logs</a></p>
               """,
               to: 'felipe.velez@ucp.edu.co',
               mimeType: 'text/html'
           )


           // Notificación por Telegram (token y chat id guardados como credenciales)
           script {
               def iconos = [SUCCESS: '✅', UNSTABLE: '⚠️', FAILURE: '❌', ABORTED: '⏹️']
               def mensaje = """${iconos.get(currentBuild.currentResult, 'ℹ️')} <b>Pipeline ${currentBuild.currentResult}</b>
Job: ${env.JOB_NAME} #${env.BUILD_NUMBER}
Duración: ${currentBuild.durationString.replace(' and counting', '')}
<a href="${env.BUILD_URL}">Ver build</a> | <a href="${env.BUILD_URL}testReport/">Pruebas</a> | <a href="${env.BUILD_URL}console">Consola</a>"""
               withEnv(["TG_MSG=${mensaje}"]) {
                   withCredentials([
                       string(credentialsId: 'telegram-bot-token', variable: 'TG_TOKEN'),
                       string(credentialsId: 'telegram-chat-id', variable: 'TG_CHAT_ID')
                   ]) {
                       sh '''
                           curl -s -o /dev/null -w "Telegram HTTP %{http_code}\\n" \
                               -X POST "https://api.telegram.org/bot${TG_TOKEN}/sendMessage" \
                               --data-urlencode "chat_id=${TG_CHAT_ID}" \
                               --data-urlencode "parse_mode=HTML" \
                               --data-urlencode "text=${TG_MSG}" || true
                       '''
                   }
               }
           }


           // Limpiar workspace
           cleanWs()
       }
   }
}
