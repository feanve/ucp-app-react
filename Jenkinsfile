pipeline {
   agent any


   tools {
       nodejs 'Node_24'  // Configurado en Global Tool Configuration
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


           // Limpiar workspace
           cleanWs()
       }
   }
}
