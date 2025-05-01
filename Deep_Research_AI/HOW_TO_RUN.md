# Royal Research App - Setup Guide

This document provides instructions for setting up and running the Royal Research app, with a focus on environment variables configuration.

## Prerequisites

- Node.js (v16 or newer)
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)
- Mobile device with Expo Go app or iOS/Android emulator

## Installation

1. Clone the repository:
   ```
   git clone <repository-url>
   cd Research_app
   ```

2. Install dependencies:
   ```
   cd expo
   npm install
   ```

## Environment Variables Setup

The app uses environment variables for sensitive configuration values like Supabase credentials and webhook URLs. These are now securely managed through our configuration system.

### Setting Up Your Environment

1. **Create your local environment file**:
   
   Copy the example file to create your local configuration:
   ```
   cp .env.example .env.local
   ```

2. **Edit your `.env.local` file** with your actual credentials:
   ```
   # Supabase Configuration
   SUPABASE_URL=your-supabase-url
   SUPABASE_ANON_KEY=your-supabase-anon-key
   
   # Webhook Configuration
   N8N_WEBHOOK_URL=your-webhook-url
   ```

  

### How Environment Variables Work

The app has a tiered approach to loading environment variables:

1. First looks in `.env.development.local` (for dev-specific, git-ignored settings)
2. Then checks `.env.local` (for local overrides, git-ignored)
3. Falls back to `.env.development` (for shared dev defaults)
4. Finally looks in `.env` (for production defaults)

Additionally, values can be set in:
- `app.config.js` (dynamic configuration)
- `app.json` in the "extra" section (static configuration)
- System environment variables with the `EXPO_PUBLIC_` prefix

## Running the App

### Development Mode

To start the app in development mode:

```
cd expo
npm start
```

This will launch the Expo development server. You can then:

- Press `a` to run on Android emulator
- Press `i` to run on iOS simulator
- Scan the QR code with Expo Go app on your physical device

### Platform-Specific Commands

To directly start on a specific platform:

```
# Android
npm run android

# iOS
npm run ios

# Web
npm run web
```

## Push Notifications

The app has been configured for push notifications:

- For Android, a placeholder `google-services.json` file is included
- For iOS, background notification modes are enabled in `app.json`

In a production environment, you would need to:
1. Replace the placeholder Google Services file with your Firebase configuration
2. Set up Apple Push Notification Service (APNS) certificates

## Troubleshooting

### Common Issues

1. **Environment variables not loading**
   - Make sure your `.env.local` file exists in the `expo` directory
   - Check for typos in variable names
   - Try running with `npx expo start --clear` to clear cache

2. **Supabase connection issues**
   - Verify your Supabase URL and anon key are correct
   - Check if you can access the Supabase dashboard directly

3. **Webhook not working**
   - Ensure your webhook URL is properly formatted with `https://`
   - Try testing the webhook URL directly with a tool like Postman

### Debug Logs

To see debug logs related to environment variables, look for output in the terminal when starting the app. The configuration system will log which environment file is being used.

## Additional Information

- The `.env.local` and similar local files are gitignored to prevent accidentally committing sensitive information
- For production deployments, set up environment variables through your hosting provider or CI/CD pipeline
- For team development, consider using a shared `.env.example` with placeholders 