import http from "node:http";

console.log("Fetching http://localhost:5000/api/ipl/overview ...");

http.get("http://localhost:5000/api/ipl/overview", (res) => {
  console.log(`STATUS: ${res.statusCode}`);
  console.log(`HEADERS: ${JSON.stringify(res.headers)}`);
  res.setEncoding("utf8");
  let rawData = "";
  res.on("data", (chunk) => { rawData += chunk; });
  res.on("end", () => {
    try {
      const parsedData = JSON.parse(rawData);
      console.log("Parsed response payload:");
      console.log(JSON.stringify(parsedData, null, 2).slice(0, 1000));
      if (rawData.length > 1000) {
        console.log("... (response truncated)");
      }
    } catch (e) {
      console.error("Failed to parse JSON:", e.message);
      console.log("Raw output:", rawData.slice(0, 500));
    }
  });
}).on("error", (e) => {
  console.error(`Request failed with error: ${e.message}`);
});
