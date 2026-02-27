# Squarespace Integration

## Requirements

- Squarespace **Business** plan or higher (Code Injection requires Business plan)

## Setup

1. Go to **Website** > **Pages** > **Custom Code** > **Code Injection**
2. In the **Footer** field, paste the following script tag:

```html
<script src="https://YOUR_FRONTEND_DOMAIN/sdk/liveconnect.js" data-key="YOUR_EMBED_KEY"></script>
```

3. Replace `YOUR_FRONTEND_DOMAIN` with your production frontend URL
4. Replace `YOUR_EMBED_KEY` with your LiveConnect embed key (format: `lck_xxx`)
5. Click **Save**

The widget will appear as a floating button on every page of your Squarespace site.
