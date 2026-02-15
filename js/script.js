// ================= LOGIN CHECK =================

if (sessionStorage.getItem('isLoggedIn') !== 'true') {
    window.location.href = "login.html";
}


// ================= GLOBAL DATA =================

let timetableData = {};


// ================= LOAD JSON =================

fetch("data/timetable.json")
    .then(response => response.json())
    .then(data => {
        timetableData = data;
        populateDropdown();
    })
    .catch(error => {
        console.error("Error loading timetable:", error);
    });


// ================= POPULATE DROPDOWN =================

function populateDropdown() {

    const dropdown = document.getElementById('ocName');

    if (!dropdown) return;

    dropdown.innerHTML = '<option value="" disabled selected>Choose a student...</option>';

    Object.keys(timetableData).sort().forEach(name => {
        let option = document.createElement('option');
        option.value = name;
        option.textContent = name;
        dropdown.appendChild(option);
    });
}


// ================= SHOW TIMETABLE =================

function showTimetable() {

    const nameInput = document.getElementById('ocName').value;
    const day = document.getElementById('day').value;

    if (!nameInput || !day) {
        alert("Please select student and day.");
        return;
    }

    const entry = timetableData[nameInput];

    if (!entry || !entry[day]) {
        showPopup(day, "", "", ["No classes scheduled."]);
        return;
    }

    const scheduleText = entry[day];
    const sessions = scheduleText.split(',').map(s => s.trim());

    showPopup(day, "", "", sessions);
}


// ================= AVAILABILITY RANGE =================

function showFreeOCsRange() {

    const day = document.getElementById("rangeDay").value;
    const startInput = document.getElementById("startTime").value;
    const endInput = document.getElementById("endTime").value;

    if (!day || !startInput || !endInput) {
        alert("Please select day, start time and end time.");
        return;
    }

    const requestedStart = convertToMinutes(startInput);
    const requestedEnd = convertToMinutes(endInput);

    if (requestedEnd <= requestedStart) {
        alert("End time must be after start time.");
        return;
    }

    let freeOCs = [];

    Object.keys(timetableData).forEach(name => {

        const entry = timetableData[name];
        const schedule = entry[day];

        if (!schedule) {
            freeOCs.push(name);
            return;
        }

        const sessions = schedule.split(",");
        let isBusy = false;

        sessions.forEach(session => {

            const timeMatch = session.match(/\d{1,2}\.\d{2}-\d{1,2}\.\d{2}/);

            if (!timeMatch) return;

            const [start, end] = timeMatch[0].split("-");

            const classStart = convertToMinutes(start.replace(".", ":"));
            const classEnd = convertToMinutes(end.replace(".", ":"));

            if (requestedStart < classEnd && requestedEnd > classStart) {
                isBusy = true;
            }

        });

        if (!isBusy) {
            freeOCs.push(name);
        }

    });

    showPopup(day, startInput, endInput, freeOCs);
}


// ================= TIME HELPER =================

function convertToMinutes(time) {
    const [hours, minutes] = time.split(":").map(Number);
    return hours * 60 + minutes;
}


// ================= POPUP =================

function showPopup(day, start, end, list) {

    const popup = document.getElementById("popupModal");
    const popupBody = document.getElementById("popupBody");

    if (!popup || !popupBody) {
        alert("Popup modal not found in HTML.");
        return;
    }

    if (list.length === 0) {

        popupBody.innerHTML = `
            <p>No OCs are free ${start ? `from ${start} to ${end}` : ""} on ${day}.</p>
        `;

    } else {

        popupBody.innerHTML = `
            <h3 style="margin-bottom:20px;">
                ${start ? `Free OCs from ${start} to ${end}` : "Schedule"} on ${day}
            </h3>
            ${list.map(item => `<div class="schedule-item">${item}</div>`).join("")}
        `;
    }

    popup.style.display = "flex";
}


// ================= CLOSE POPUP =================

function closePopup() {
    document.getElementById("popupModal").style.display = "none";
}


// ================= LOGOUT =================

function logout() {
    sessionStorage.removeItem('isLoggedIn');
    window.location.href = "login.html";
}
