/*
Description:
A special tool to be used ONLY when a CRITICAL API FAILURE observation indicates the context window is full. It signals the system to analyze the error, determine the token limit, and intelligently summarize the oldest parts of your memory. Pass the full error message from the observation as an argument.

Arguments:
- errorMessage: The full text of the API error message provided in the observation.

Example Call (in JSON format):
{
  "errorMessage": "API request failed: You exceeded your current quota... limit: 1000000..."
}
*/

if (!args.errorMessage) {
  return "Error: The 'errorMessage' argument is required.";
}

// This tool doesn't perform a complex action itself. It returns a structured
// signal that the TaskRunner will intercept and act upon.
return JSON.stringify({
  action: "request_memory_compression",
  details: {
    errorMessage: args.errorMessage,
  }
});