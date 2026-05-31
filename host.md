# Deployment Guide

This guide outlines how to push your Neon Tic-Tac-Toe codebase to GitHub and host it on **Vercel** and **Render** as a static website.

---

## 1. Push Code to GitHub

First, you need to publish your codebase to a GitHub repository.

1. Create a new repository on [GitHub](https://github.com/new). Name it `Tic-Tac-Toe` (or any name you prefer). Keep it public or private. Do **not** initialize it with a README, gitignore, or license.
2. Open your terminal in the project directory (`/home/rohit/Desktop/GitHub/Tic_Tac_Toe/Tic_Tac_Toe`).
3. Run the following commands to commit your code and push it:

```bash
# Add all files to staging
git add .

# Create your first commit
git commit -m "feat: initial commit of neon tic tac toe with probability engine"

# Rename default branch to main (if not already main)
git branch -M main

# Add the remote repository URL (replace with your repository's URL)
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPOSITORY_NAME.git

# Push the code to GitHub
git push -u origin main
```

---

## 2. Host on Vercel (Recommended)

Vercel provides blazing-fast static site hosting. It automatically detects HTML/CSS/JS applications and deploys them with zero configuration.

### Option A: Via Vercel Web Dashboard (Easiest)
1. Go to the [Vercel Dashboard](https://vercel.com/dashboard) and sign in (you can use your GitHub account).
2. Click the **"Add New..."** button and select **"Project"**.
3. Import your `Tic-Tac-Toe` repository from your connected GitHub account.
4. Leave all settings at their default values:
   - **Framework Preset**: Other (automatically detected)
   - **Build Command**: (Empty/None)
   - **Output Directory**: (Empty/None - uses root directory)
5. Click **"Deploy"**.
6. Vercel will build and deploy your site in seconds and provide you with a production URL (e.g., `tic-tac-toe-three.vercel.app`). Any subsequent pushes to your `main` branch will automatically trigger a new deployment.

### Option B: Via Vercel CLI
If you prefer deploying directly from the command line:
```bash
# Install Vercel CLI globally
npm install -g vercel

# Run the deployment command (follow the interactive setup prompt)
vercel
```
To deploy to production after linking the project, run:
```bash
vercel --prod
```

---

## 3. Host on Render

Render is another popular, free cloud hosting platform suitable for static sites.

1. Go to the [Render Dashboard](https://dashboard.render.com/) and sign in.
2. Click the **"New +"** button and select **"Static Site"**.
3. Connect your GitHub account and select your `Tic-Tac-Toe` repository.
4. Configure the deployment settings:
   - **Name**: `neon-tic-tac-toe` (or any unique name)
   - **Branch**: `main`
   - **Build Command**: (Leave empty)
   - **Publish Directory**: `.` (or `./` to serve files from the root folder)
5. Click **"Create Static Site"**.
6. Render will fetch the repository, build, and host it. You will receive a URL like `neon-tic-tac-toe.onrender.com`. Like Vercel, pushes to `main` automatically trigger redeployments.
