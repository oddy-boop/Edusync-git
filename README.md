# Firebase Studio

This is a NextJS starter in Firebase Studio.

To get started, take a look at src/app/page.tsx.

## Deployment

To host your application and make it available to the public, you need to deploy it. Here are the steps for deploying to Firebase Hosting.

### Prerequisites
- Make sure you have a Firebase project created on the [Firebase Console](https://console.firebase.google.com/).
- If you are using Supabase, ensure your environment variables (`.env.local`) are set up for your production Supabase project.

### 1. Install Firebase CLI

If you don't have it installed, open your terminal and run:
```bash
npm install -g firebase-tools
```

### 2. Login to Firebase

In your terminal, log in to your Firebase account:
```bash
firebase login
```

### 3. Initialize Firebase Hosting

In your project's root directory (the same level as `package.json`), run:
```bash
firebase init hosting
```

Follow the prompts from the CLI:
- **Select an existing project:** Choose the Firebase project you are using for this app.
- **The CLI will detect you are using a Next.js web framework.** It will ask if you want to use it. Say `Yes`.
- **Select a region for your server-side code.** Choose a region close to your users (e.g., `us-central1`).
- **Set up automatic builds and deploys with GitHub?** You can say `No` for now to keep it simple.

This command will create `firebase.json` and `.firebaserc` files and configure them for your Next.js application.

### 4. Deploy Your App

Now, you can build and deploy your app with a single command:
```bash
firebase deploy --only hosting
```

After the command finishes, your app will be live at the URLs provided in the terminal! Any time you want to deploy new changes, just run this command again.

---

### Alternative: Vercel

Vercel is another excellent platform for hosting Next.js apps, created by the team behind Next.js.
1.  Push your code to a Git repository (like GitHub, GitLab, or Bitbucket).
2.  Go to [vercel.com](https://vercel.com), sign up, and create a new project.
3.  Import your Git repository.
4.  Vercel will automatically detect that it's a Next.js app and deploy it. It will also automatically re-deploy every time you push new changes to your repository.
