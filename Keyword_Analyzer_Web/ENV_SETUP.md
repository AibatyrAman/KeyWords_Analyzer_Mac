# Environment Setup

## OpenAI API Key Configuration

1. Create a `.env` file in the root directory of the project
2. Add your OpenAI API key:

```
REACT_APP_OPENAI_API_KEY=your_actual_openai_api_key_here
```

## Important Notes

- The `.env` file should be added to `.gitignore` to keep your API key secure
- Never commit your actual API key to version control
- The application will show appropriate error messages if the API key is missing

## Example .env file

```
REACT_APP_OPENAI_API_KEY=sk-proj-your-actual-key-here
```

## Security

- Keep your API key private and secure
- Rotate your API key regularly
- Monitor your OpenAI API usage
