# 🚀 Quick Start Guide

Get your AI Architect application up and running in 5 minutes!

## Step 1: Install Dependencies

```bash
cd ai-architect
npm install
```

## Step 2: Get a Gemini API Key

1. Visit [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy your API key

## Step 3: Configure API Key (Optional)

You can set your API key in two ways:

### Option A: Environment Variable (Recommended for production)
```bash
cp .env.example .env.local
```

Edit `.env.local` and add:
```
GEMINI_API_KEY=your_actual_api_key_here
```

### Option B: In the App (Recommended for testing)
You can enter your API key directly in the chat interface when you run the app.

## Step 4: Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Step 5: Try It Out!

1. **Landing Page**: Click "Start Building"
2. **Add API Key**: Click the key icon (🔑) in the chat panel and paste your Gemini API key
3. **Chat with AI**: Try these examples:
   - "I need a 2-bedroom apartment with an open kitchen"
   - "Design a small office space with meeting room and workspace"
   - "Create a studio apartment that's compliant with Danish regulations"

## Example Prompts

Here are some prompts to get you started:

### Simple Apartment
```
I need a 60m² apartment with:
- 2 bedrooms
- 1 bathroom
- Open kitchen and living room
- Ensure it complies with Hvidovre building codes
```

### Office Space
```
Design a 100m² office with:
- Reception area
- 2 meeting rooms
- Open workspace
- Kitchen/break room
- Bathroom
```

### Custom Requirements
```
I want a floor plan for a 3-bedroom house with:
- Master bedroom with ensuite bathroom
- 2 additional bedrooms
- Guest bathroom
- Open plan living/dining/kitchen
- Laundry room
- Must meet Danish BR23 regulations
```

## Troubleshooting

### "API key is required" error
- Make sure you've entered your Gemini API key in the chat interface
- Or add it to your `.env.local` file

### Floor plan not rendering
- Check the browser console for errors
- Verify your API key is valid
- Make sure you're asking for a valid floor plan

### Styling looks off
- Clear your browser cache
- Make sure dark mode is enabled (it should be by default)
- Try refreshing the page

## Next Steps

- Explore the zoom and pan controls
- Try different room configurations
- Export your floor plans (coming soon)
- Save your favorite designs (coming soon)

## Need Help?

- Check the main [README.md](./README.md) for detailed documentation
- Review the Danish building regulations we enforce
- Experiment with different prompts to see what works best

---

**Happy building! 🏗️**
