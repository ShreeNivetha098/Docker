# CI/CD Pipeline Using Docker

A local demonstration of a CI/CD pipeline. GitHub stores the application, Jenkins tests it and builds a Docker image, and Docker runs the site at [http://localhost:3000](http://localhost:3000).

No Kubernetes, cloud host, or paid service is required.

## Project overview

The sample application is a small Node.js website. Its pages explain Continuous Integration and Continuous Deployment, show the six pipeline stages, and display the running version.

The Jenkins job does six things, in order:

1. **Checkout** retrieves the project from GitHub.
2. **Install Dependencies** runs `npm ci`.
3. **Test** runs `npm test` and stops the job if a test fails.
4. **Build** creates a Docker image tagged with the Jenkins build number.
5. **Deploy** stops and removes the previous container, then starts the new image.
6. **Verify** requests `http://127.0.0.1:3000/health` until the new container answers.

Pushing to GitHub does **not** start Jenkins by itself. You start each demonstration run with **Build Now**. An optional poll can be enabled later; until then, say that the trigger is manual.

## Architecture and workflow

```text
You edit code
    |
    |  git commit && git push          (manual)
    v
GitHub repository
    |
    |  Build Now                       (manual)
    v
Jenkins
    |-- Checkout
    |-- npm ci
    |-- npm test                       (failure stops the pipeline)
    |-- docker build
    |-- docker stop / rm / run
    |-- node scripts/verify.js
    v
Docker container cicd-pipeline-demo
    |
    v
Browser at http://localhost:3000      (manual refresh)
```

| Piece | Role |
| --- | --- |
| `server.js` | Serves the site, `/health`, and `/api/info`. |
| `public/` | HTML, CSS, and the browser script that shows version and status. |
| `tests/app.test.js` | Checks the health endpoint, version API, and homepage text. |
| `Dockerfile` | Packages the app with Node.js 20. |
| `scripts/verify.js` | Used by Jenkins to confirm the container is answering. |
| `Jenkinsfile` | Defines the six stages for Windows, macOS, and Linux agents. |

The page reads the version from `package.json` through `/api/info`. Change `version` and `releaseLabel` there when you want the second demo to show a new release.

## Software prerequisites

Install these on the computer that runs Jenkins. The same computer should run Docker, because the pipeline deploys to local Docker.

- Git
- Node.js 20 LTS (Node.js 18 or newer also works) and npm
- Docker Desktop on Windows or macOS, or Docker Engine on Linux
- Jenkins LTS, with the suggested plugins (Git and Pipeline)
- A modern browser
- A GitHub account

Confirm the tools in a terminal before you configure Jenkins:

```bash
git --version
node -v
npm -v
docker version
```

Docker Desktop must be running. `docker version` should show both a Client and a Server section.

## Project files

```text
.
├── .dockerignore
├── .gitignore
├── Dockerfile
├── Jenkinsfile
├── README.md
├── package.json
├── package-lock.json
├── server.js
├── public/
│   ├── index.html
│   ├── styles.css
│   └── app.js
├── scripts/
│   └── verify.js
└── tests/
    └── app.test.js
```

## Installation

From this folder:

```bash
npm ci
npm test
```

Expected test result: three passing tests and an exit code of 0. The tests cover `/health`, `/api/info`, and the homepage wording. They read the version from `package.json`, so changing the version for the second demo does not break the tests.

Start the app without Docker when you only want a quick look:

```bash
npm start
```

Expected log:

```text
CI/CD Pipeline Using Docker is running at http://localhost:3000
Version 1.0.0 (Initial Release)
```

Open [http://localhost:3000](http://localhost:3000). Stop the process with Ctrl+C before the Docker run below, so port 3000 is free.

## Docker build and run

Build and run the image yourself once, before involving Jenkins. This proves the container works.

macOS and Linux:

```bash
docker build -t cicd-pipeline-demo:local .
docker run -d --name cicd-pipeline-demo -p 3000:3000 cicd-pipeline-demo:local
curl http://127.0.0.1:3000/health
```

Windows Command Prompt (the Jenkins agent uses these forms):

```bat
docker build -t cicd-pipeline-demo:local .
docker run -d --name cicd-pipeline-demo -p 3000:3000 cicd-pipeline-demo:local
curl http://127.0.0.1:3000/health
```

Expected health response:

```json
{"status":"ok","version":"1.0.0"}
```

`docker ps` should list `cicd-pipeline-demo`. The STATUS column becomes `healthy` after the image health check succeeds.

Stop this practice container before the first Jenkins deploy, so the job can create the same container name:

```bash
docker stop cicd-pipeline-demo
docker rm cicd-pipeline-demo
```

Windows Command Prompt uses the same two commands.

The image listens on port 3000 inside the container. The server binds to `0.0.0.0`, which is required for Docker's published port to reach Node.js.

## GitHub setup

Create an empty GitHub repository in the browser. Do not add a README, `.gitignore`, or license there, because this folder already contains them. A public repository avoids storing credentials in Jenkins.

Replace the placeholder URL with your repository URL. Do not put a password or token in any project file.

```bash
git init
git add .
git commit -m "Initial CI/CD pipeline demo"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPOSITORY.git
git push -u origin main
```

GitHub may ask you to sign in through Git Credential Manager or the `gh` command. That login stays outside this repository.

Later updates:

```bash
git add .
git commit -m "Update application version to 1.1.0"
git push
```

`git push` updates GitHub only. It does not deploy the site.

## Jenkins configuration

### Install Jenkins

Use the Jenkins LTS installer, or run the WAR file with Java 17 or 21:

```bash
java -jar jenkins.war
```

During setup, install the **suggested plugins**. You need Git and Pipeline. You do not need a NodeJS plugin or a Docker Pipeline plugin, because the Jenkinsfile calls `npm` and `docker` on the agent PATH.

Open Jenkins at [http://localhost:8080](http://localhost:8080).

### Let the Jenkins agent use Docker and Node.js

The account that runs the Jenkins agent must be able to run `node`, `npm`, and `docker`.

**Windows (Docker Desktop)**

1. Start Docker Desktop and wait until the engine is running.
2. Install Node.js 20 and Git for the same Windows user.
3. Open a new Command Prompt and run `node -v`, `npm -v`, and `docker version`.
4. Prefer running Jenkins from that user account. A Windows service running as **Local System** often cannot see Docker Desktop.
5. If a build reports that `docker` is not recognized, either log the Jenkins service on as your Windows user, or stop the service and start Jenkins from your user terminal with `java -jar jenkins.war`.
6. Do not enable "Expose daemon on tcp://localhost:2375 without TLS". The pipeline uses the normal Docker Desktop command.

**macOS (Docker Desktop)**

1. Start Docker Desktop.
2. Install Jenkins with Homebrew (`brew install jenkins-lts`) or `java -jar jenkins.war`, as your user.
3. The Jenkinsfile takes the Unix path (`sh`) on macOS. Commands match the Linux block below.

**Linux (Docker Engine)**

```bash
sudo usermod -aG docker jenkins
sudo systemctl restart jenkins
```

Log out and back in if you also run Docker as your own user. The pipeline commands are:

```bash
npm ci
npm test
docker build -t cicd-pipeline-demo:${BUILD_NUMBER} -t cicd-pipeline-demo:latest .
docker stop cicd-pipeline-demo || true
docker rm cicd-pipeline-demo || true
docker run -d --name cicd-pipeline-demo -p 3000:3000 cicd-pipeline-demo:${BUILD_NUMBER}
node scripts/verify.js
```

Jenkins sets `BUILD_NUMBER`. The Windows agent uses `%BUILD_NUMBER%` and `|| echo` instead of `|| true`.

### Create the job

1. In Jenkins, choose **New Item**.
2. Name it `cicd-pipeline-docker`, select **Pipeline**, and click OK.
3. Under **Pipeline**, set **Definition** to **Pipeline script from SCM**.
4. Set **SCM** to **Git**.
5. Set **Repository URL** to `https://github.com/YOUR_USERNAME/YOUR_REPOSITORY.git`.
6. Leave credentials empty for a public repository. For a private repository, add a username and token in **Manage Jenkins → Credentials**, then select that credential here. Never commit the token.
7. Set **Branch Specifier** to `*/main`.
8. Set **Script Path** to `Jenkinsfile`.
9. Save the job.

Leave **Build Triggers** empty. The demonstration trigger is the **Build Now** button.

Optional, after the first successful run: polling makes Jenkins look for new commits. In the job configuration, you can add `H/2 * * * *` under **Poll SCM**, or uncomment a `triggers { pollSCM('H/2 * * * *') }` block if you add one to the Jenkinsfile. A GitHub webhook is a poor fit for this demo because GitHub cannot call a Jenkins server on your laptop unless you add a tunnel. Do not describe the pipeline as automatic until one of those triggers is actually saved and a push starts a build on its own.

## How to execute the pipeline

1. Push `main` to GitHub using the commands above.
2. Stop any container already named `cicd-pipeline-demo`, and stop `npm start` if it is using port 3000.
3. Open the Jenkins job and click **Build Now**.
4. Open the build's **Console Output**.

Expected stage messages:

```text
SUCCESS: Checkout retrieved the source code from Git.
SUCCESS: Application dependencies are installed.
SUCCESS: Automated tests passed.
SUCCESS: Docker image built.
SUCCESS: Previous container replaced with the new image.
SUCCESS: Verify received a healthy response from http://127.0.0.1:3000/health
SUCCESS: Deployed application responded on port 3000.
PIPELINE SUCCESS: Open http://localhost:3000 in a browser.
```

The first deploy prints a Docker message that the container does not exist yet. On macOS and Linux the command ends with `|| true`, so the stage continues. On Windows it prints `No previous container to stop.` The following `docker run` creates the container.

5. Open [http://localhost:3000](http://localhost:3000).

Expected page:

- Title: CI/CD Pipeline Using Docker
- Status: Deployed
- Version: v1.0.0
- Release: Initial Release
- A container start time

## How to demonstrate an application update

1. Edit `package.json`:
   - set `"version"` to `"1.1.0"`
   - set `"releaseLabel"` to `"Updated Release"`
2. Commit and push:

```bash
git add package.json
git commit -m "Update application version to 1.1.0"
git push
```

3. In Jenkins, click **Build Now** again. Wait for **PIPELINE SUCCESS**.
4. Refresh [http://localhost:3000](http://localhost:3000).

Expected page after the second run:

- Status: Deployed
- Version: v1.1.0
- Release: Updated Release
- A new container start time

`docker ps` still shows one container named `cicd-pipeline-demo`. Jenkins removed the previous container in the Deploy stage. `docker images` shows a new `cicd-pipeline-demo` tag for the new build number, plus `latest`.

### What is manual, and what the job does after you start it

| Action | Who does it |
| --- | --- |
| Edit `package.json` | You |
| Commit and push | You |
| Start the Jenkins job | You, with Build Now |
| Checkout, install, test, build, deploy, verify | Jenkins |
| Refresh the browser | You |

## Common errors and solutions

**`docker` is not recognized inside Jenkins, but it works in your terminal.**  
The Jenkins process is running as another user. On Windows, start Jenkins as the user who can run Docker Desktop. On Linux, add the `jenkins` user to the `docker` group and restart Jenkins.

**`docker: command not found` or the server section is missing from `docker version`.**  
Start Docker Desktop or the Docker service, then run the job again.

**`Bind for 0.0.0.0:3000 failed: port is already allocated`.**  
Port 3000 is in use. Stop `npm start`, or stop the old container:

```bash
docker stop cicd-pipeline-demo
docker rm cicd-pipeline-demo
```

**`npm` is not recognized.**  
Install Node.js 20, open a new terminal, and restart Jenkins so it inherits the updated PATH.

**Checkout failed, or the branch was not found.**  
The job URL must be the real repository, the branch specifier must be `*/main`, and the code must be pushed. A private repository needs a Jenkins credential. An empty repository URL placeholder will not work.

**`npm ci` failed because `package-lock.json` is missing.**  
Run `npm install` locally, commit `package-lock.json`, and push. This repository includes the lock file.

**Tests failed.**  
Jenkins stops before Build. The previous container, if any, keeps running because Deploy did not start. Fix the test, push, and click Build Now again.

**Verify failed after Deploy.**  
The new container was started, but `/health` did not return `ok`. Read `docker logs cicd-pipeline-demo`. A common cause is an application crash or port 3000 still belonging to another process.

**The browser still shows v1.0.0.**  
Confirm the second Jenkins build finished with PIPELINE SUCCESS, then refresh [http://localhost:3000](http://localhost:3000). Do not open `public/index.html` as a file. The status script only works when the site is served by the container.

**The homepage status says Not responding.**  
The page was opened from disk, or the container is stopped. Use the localhost URL after Verify succeeds.

## Useful checks

```bash
docker ps
docker logs cicd-pipeline-demo
curl http://127.0.0.1:3000/health
curl http://127.0.0.1:3000/api/info
```

Remove the demo container when you are finished:

```bash
docker stop cicd-pipeline-demo
docker rm cicd-pipeline-demo
```

## Short presentation script

> This project shows a CI/CD pipeline on one computer. The application is a Node.js website. GitHub holds the code. Jenkins runs the pipeline. Docker runs the site at localhost port 3000.
>
> Continuous Integration is the first half. Jenkins checks out the repository, installs dependencies, and runs automated tests. If a test fails, the pipeline stops and does not deploy that version.
>
> Continuous Deployment is the second half. After the tests pass, Jenkins builds a Docker image, replaces the old container, and requests the health URL. I start each run with Build Now. The push does not start Jenkins until a trigger is configured. After I click Build Now, the six stages run on their own.
>
> On the first run, the page shows version 1.0.0, Initial Release. I then change the version to 1.1.0, commit, push, and start Jenkins again. Refreshing the browser shows 1.1.0 and a new container start time. That is the same pipeline deploying a new version.
