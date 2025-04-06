const { execSync } = require("child_process");

try {
  if (process.env.VERCEL_ENV === "production") {
    execSync("chmod +x ../eliza/start-eliza.sh && ../eliza/start-eliza.sh", { stdio: "inherit" });
  }
  console.log("ElizaOS démarré avec succès");
} catch (error) {
  console.error("Erreur lors du démarrage d'ElizaOS", error);
}
