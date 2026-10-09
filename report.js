// 1. Connect the HTML elements to JavaScript
const form = document.querySelector("#report-form");
const message = document.querySelector("#form-message");
const submitButton = document.querySelector("#submit-button");
const imageInput = document.querySelector("#images");
const fileList = document.querySelector("#file-list");
const dateInput = document.querySelector("#report-date");

// 2. Paste your deployed Google Apps Script URL here
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwueckt7jzVyS5QqPy78gW4H40WlL2P8-mBGvG-BrxiAgm7lnhAv2LfX4yIHP_0i6FR/exec";

// 3. Set photo limits to match Code.gs
const MAX_FILES = 5;
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp"
];

// 4. Set today's date as the default report date
dateInput.value = new Date().toLocaleDateString("en-CA");

// 5. Display messages to the user
function showMessage(text, type = "") {
  message.textContent = text;
  message.className = `message ${type}`.trim();
}

// 6. Show the names and sizes of selected photos
imageInput.addEventListener("change", () => {
  const files = [...imageInput.files];

  if (!files.length) {
    fileList.textContent = "No photos selected yet.";
    return;
  }

  fileList.textContent = files
    .map(file =>
      `${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`
    )
    .join(" · ");
});

// 7. Check that the photos are valid
function validateFiles(files) {
  if (!files.length) {
    return "Please add at least one photo of the damaged item.";
  }

  if (files.length > MAX_FILES) {
    return `Please choose no more than ${MAX_FILES} photos.`;
  }

  for (const file of files) {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return `"${file.name}" must be a JPG, PNG, or WEBP image.`;
    }

    if (file.size > MAX_FILE_SIZE) {
      return `Each photo must be 5 MB or smaller. "${file.name}" is too large.`;
    }
  }

  return "";
}

// 8. Convert a photo into Base64 for Google Apps Script
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const result = reader.result;
      resolve(result.split(",")[1]);
    };

    reader.onerror = () => {
      reject(new Error(`Could not read the photo "${file.name}".`));
    };

    reader.readAsDataURL(file);
  });
}

// 9. Handle form submission
form.addEventListener("submit", async (event) => {
  event.preventDefault();
  showMessage("");

  // Check that the URL has been added
  if (
    !GOOGLE_SCRIPT_URL.startsWith(
      "https://script.google.com/macros/s/"
    ) ||
    !GOOGLE_SCRIPT_URL.endsWith("/exec")
  ) {
    showMessage(
      "Please add your correct Google Apps Script Web app URL in report.js.",
      "error"
    );
    return;
  }

  // Check required HTML form fields
  if (!form.reportValidity()) {
    showMessage("Please complete all required fields.", "error");
    return;
  }

  // Check selected photos
  const files = [...imageInput.files];
  const fileError = validateFiles(files);

  if (fileError) {
    showMessage(fileError, "error");
    return;
  }

  // Check quantity
  const quantity = Number(
    document.querySelector("#quantity").value
  );

  if (!Number.isInteger(quantity) || quantity < 1) {
    showMessage(
      "Quantity must be a whole number of at least 1.",
      "error"
    );
    return;
  }

  submitButton.disabled = true;
  submitButton.textContent = "Preparing report…";

  try {
    showMessage(
      "Preparing your report and photos. Please wait.",
      "info"
    );

    // Convert all selected photos into Base64 data
    const photos = await Promise.all(
      files.map(async (file) => ({
        name: file.name,
        type: file.type,
        size: file.size,
        base64: await fileToBase64(file)
      }))
    );

    // Collect the form information
    const payload = {
      engineer_name: document
        .querySelector("#engineer-name").value.trim(),

      site: document
        .querySelector("#site").value.trim(),

      report_date: dateInput.value,

      item_name: document
        .querySelector("#item-name").value.trim(),

      quantity: quantity,

      serial_number: document
        .querySelector("#serial-number").value.trim(),

      description: document
        .querySelector("#description").value.trim(),

      photos: photos
    };

    submitButton.textContent = "Submitting report…";

    showMessage(
      "Uploading photos and saving your report. Please wait.",
      "info"
    );

    // Send the report to Google Apps Script
    const response = await fetch(GOOGLE_SCRIPT_URL, {
      method: "POST",
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(
        `The request failed with status ${response.status}.`
      );
    }

    const result = await response.json();

    if (!result.success) {
      throw new Error(
        result.message || "Google Apps Script could not save the report."
      );
    }

    // Submission succeeded
    showMessage("Report submitted successfully!", "success");

    window.location.href = "./success.html";

  } catch (error) {
    console.error("Report submission failed:", error);

    showMessage(
      `We could not confirm your report submission. ${
        error.message || "Please check your connection."
      } Check Google Sheets and Drive before trying again, to avoid duplicate reports.`,
      "error"
    );

    submitButton.disabled = false;
    submitButton.textContent = "Submit damage report";
  }
});