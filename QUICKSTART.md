# Quick Start Guide

## Setup (5 minutes)

### 1. Install Dependencies
```bash
pnpm install
```

### 2. Configure Environment Variables

Create `.env.local` file:

```bash
# Required
GOOGLE_GENERATIVE_AI_API_KEY=your_gemini_api_key_here
PINECONE_API_KEY=your_pinecone_api_key_here
PINECONE_TEXT_INDEX=nba-cards-text
PINECONE_IMAGE_INDEX=nba-cards-image

# Optional (for web search)
TAVILY_API_KEY=your_tavily_api_key_here
```

**Get API Keys:**
- Gemini: https://aistudio.google.com/app/apikey
- Pinecone: https://www.pinecone.io/
- Tavily (optional): https://www.tavily.com/

### 3. Create Pinecone Indexes

Create **two indexes** in Pinecone:

**Index 1: nba-cards-text**
- Dimensions: `768`
- Metric: `cosine`
- Type: `dense`

**Index 2: nba-cards-image**
- Dimensions: `512`
- Metric: `cosine`
- Type: `dense`

### 4. Run Development Server
```bash
pnpm dev
```

Open http://localhost:3000

## Usage

### Process Your First Card

1. **Go to "Analyze Card" tab**

2. **Upload a PSA card image**
   - Drag & drop or click to upload
   - Supports JPEG, PNG, WEBP, PDF

3. **Optional: Add a hint**
   - Example: "LeBron James 2003 rookie card"
   - Helps AI understand difficult images

4. **Optional: Enable web search**
   - Check the box to enrich description
   - Requires TAVILY_API_KEY

5. **Click "Run Agent"**
   - Agent processes through 6 tools
   - Takes 10-30 seconds depending on options
   - Watch the progress indicator

6. **View Results**
   - Card information extracted
   - PSA certification link
   - Rich collector description (if web search enabled)
   - Card automatically saved to collection

### Search Your Collection

1. **Go to "Search & Chat" tab**

2. **Ask questions:**
   - "Show me all LeBron James cards"
   - "What's my highest graded card?"
   - "Find 2003 rookie cards"
   - "List all PSA 10 cards"

3. **Get AI responses**
   - Powered by hybrid RAG search
   - References specific cards from your collection

### Browse Collection

1. **Go to "My Collection" tab**

2. **View all cards**
   - Visual grid layout
   - Card details and grades
   - Click refresh to update

## Agent Workflow

The LangGraph agent executes these steps:

```
1. get_card_info       → Validate image
2. validate_nba_card   → Extract card data with AI
3. certify_card        → Verify PSA certification
4. describe_card       → Generate description (+ optional web search)
5. generate_embeddings → Create text & image embeddings
6. save_to_database    → Store in Pinecone & local filesystem
```

## Troubleshooting

### "Agent failed" error
- Check API keys in `.env.local`
- Ensure Pinecone indexes exist with correct dimensions
- Check browser console for detailed errors

### "Web search failed" warning
- Verify TAVILY_API_KEY is set correctly
- Agent continues without web search (non-fatal)

### Image not recognized
- Ensure PSA label is clearly visible
- Try adding a user hint
- Image should show entire PSA slab

### No cards in collection
- Process at least one card first
- Check Pinecone dashboard to verify data

## Example Cards

Good test images should have:
- ✅ Clear PSA label/slab
- ✅ Visible grade number (1-10)
- ✅ Visible certification number
- ✅ Player name readable
- ✅ Good lighting

## Next Steps

- Process multiple cards to build your collection
- Try the chat interface to query cards
- Enable web search for enhanced descriptions
- Check IMPLEMENTATION_SUMMARY.md for technical details
- Read README.md for complete documentation



