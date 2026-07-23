const fs = require("fs");
const path = require("path");

const LOG_DIR = path.join(__dirname, "..", "logs");

if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
}

function getLogFile() {
    const date = new Date().toISOString().split("T")[0];
    return path.join(LOG_DIR, `${date}.log`);
}

function write(level, message) {
    const time = new Date().toISOString();

    const line = `[${time}] [${level}] ${message}`;

    console.log(line);

    try {
        fs.appendFileSync(getLogFile(), line + "\n");
    } catch (err) {
        console.error("Logger Error:", err.message);
    }
}

module.exports = {

    info(message) {
        write("INFO", message);
    },

    success(message) {
        write("SUCCESS", message);
    },

    warn(message) {
        write("WARNING", message);
    },

    error(message) {
        write("ERROR", message);
    },

    debug(message) {
        write("DEBUG", message);
    }

};
