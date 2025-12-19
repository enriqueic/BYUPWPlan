import { Diploma } from './classes.js';

document.addEventListener("DOMContentLoaded", () => {
    const select = document.getElementById("country-select");
    const button = document.querySelector("button");
    const termInput = document.getElementById("term-input");
    const sectionSelector = "section";
    const modal = document.getElementById("modal");
    const modalMsg = document.getElementById("modal-message");
    const closeModalBtn = document.getElementById("close-modal");
    const completedClassesContainer = document.getElementById("completed-classes-container");
    const globalCompletedDict = {};

    // Track user toggle order for display
    const userToggleOrder = [];

    // Add a paragraph for total credits
    let totalCreditsParagraph = document.getElementById("total-credits-paragraph");
    if (!totalCreditsParagraph) {
        totalCreditsParagraph = document.createElement("p");
        totalCreditsParagraph.id = "total-credits-paragraph";
        completedClassesContainer.parentNode.insertBefore(totalCreditsParagraph, completedClassesContainer);
    }

    const completedDict = {};
    let groupedClassesCache = {};
    const userToggled = {};

    closeModalBtn.addEventListener("click", () => {
        modal.style.display = "none";
    });

    function renderCompletedClasses() {
        let term = parseInt(termInput.value, 10);
        if (isNaN(term) || term < 1) term = 1;
        if (term > 6) term = 1;

        let completed = [];
        let totalCredits = 0;
        let toggledCredits = 0;
        const alreadyCounted = new Set();

        // Count credits for classes already completed from JSON or globalCompletedDict
        Object.entries(completedDict).forEach(([group, classes]) => {
            Object.entries(classes).forEach(([name, done]) => {
                if (done) {
                    for (const groupName in groupedClassesCache) {
                        const arr = groupedClassesCache[groupName];
                        const found = arr.find(c => c.name === name);
                        if (found && found.credits) {
                            totalCredits += Number(found.credits) || 0;
                            alreadyCounted.add(name);
                            break;
                        }
                    }
                }
            });
        });

        // Use userToggleOrder for display order
        completed = userToggleOrder
            .filter(key => {
                const [group, name] = key.split('|||');
                return userToggled[group] && userToggled[group][name];
            })
            .map(key => key.split('|||')[1]);

        // Calculate toggled credits
        userToggleOrder.forEach(key => {
            const [group, name] = key.split('|||');
            if (userToggled[group] && userToggled[group][name] && !alreadyCounted.has(name)) {
                for (const groupName in groupedClassesCache) {
                    const arr = groupedClassesCache[groupName];
                    const found = arr.find(c => c.name === name);
                    if (found && found.credits) {
                        toggledCredits += Number(found.credits) || 0;
                        totalCredits += Number(found.credits) || 0;
                        break;
                    }
                }
            }
        });

        completedClassesContainer.innerHTML = "";

        if (completed.length === 0) {
            completedClassesContainer.innerHTML = "<div style='color:gray;'>None yet</div>";
        } else {
            let html = '<div style="display:flex;gap:2rem;flex-wrap:wrap;">';
            for (let i = 0; i < completed.length; i += 5) {
                let colTerm = ((term + Math.floor(i / 5) - 1) % 6) + 1;
                html += `<div style="min-width:120px;">
                            <h3 style="margin-top:0;">Term ${colTerm}</h3>`;
                for (let j = i; j < i + 5 && j < completed.length; j++) {
                    html += `<div>${completed[j]}</div>`;
                }
                html += '</div>';
            }
            html += '</div>';
            completedClassesContainer.innerHTML = html;
        }

        totalCreditsParagraph.textContent = `Total Credits: (${totalCredits})`;
    }

    async function renderDiploma() {
        const diplomaName = select.value;
        const diploma = new Diploma(diplomaName, "Term 5");
        const grid = document.querySelector(sectionSelector);
        if (!grid) return;

        grid.innerHTML = "";

        const groupedClasses = await diploma.getGroupedClasses();
        groupedClassesCache = groupedClasses;

        const groupsOrder = await diploma.getRequiredGroups();
        if (groupedClasses["General Education"]) {
            groupsOrder.push("General Education");
        }

        // Initialize completedDict from groupedClasses and globalCompletedDict
        Object.entries(groupedClasses).forEach(([groupName, classes]) => {
            if (!completedDict[groupName]) completedDict[groupName] = {};
            classes.forEach(cls => {
                completedDict[groupName][cls.name] =
                    (globalCompletedDict[groupName] && typeof globalCompletedDict[groupName][cls.name] === "boolean")
                        ? globalCompletedDict[groupName][cls.name]
                        : cls.completed === true;
            });
        });

        groupsOrder.forEach(groupName => {
            const classes = groupedClasses[groupName];
            if (!classes) return;

            const groupDiv = document.createElement('div');
            groupDiv.className = 'group-div';

            const groupHeading = document.createElement('h3');
            groupHeading.textContent = groupName;
            groupDiv.appendChild(groupHeading);

            classes.forEach(cls => {
                const isCompleted =
                    completedDict[groupName] && typeof completedDict[groupName][cls.name] === "boolean"
                        ? completedDict[groupName][cls.name]
                        : cls.completed;

                // Only show prerequisites line if there are prerequisites, and bold the class names
                let prereqLine = "";
                if (cls.prerequisites && cls.prerequisites.length) {
                    prereqLine = `Prerequisites: <strong>${cls.prerequisites.join(', ')}</strong><br>`;
                }

                const card = document.createElement('div');
                card.className = 'class-card';
                card.style.border = '1px solid #ccc';
                card.style.padding = '0.5rem';
                card.style.background = isCompleted ? '#e0ffe0' : '#ffe0e0';
                card.style.cursor = 'pointer';

                card.innerHTML = `
                    <strong>${cls.name}</strong><br>
                    Credits: ${cls.credits}<br>
                    ${prereqLine}
                    <span class="status-text" style="font-weight:bold;color:${isCompleted ? 'green' : 'red'}">${isCompleted ? 'Completed' : 'Incomplete'}</span>
                `;

                card.addEventListener('click', () => {
                    // Check prerequisites
                    if (
                        (!completedDict[groupName] || !completedDict[groupName][cls.name]) &&
                        cls.prerequisites &&
                        cls.prerequisites.length > 0
                    ) {
                        let unmet = [];
                        for (const prereq of cls.prerequisites) {
                            let found = false;
                            for (const g of groupsOrder) {
                                const groupClasses = groupedClasses[g];
                                if (groupClasses && groupClasses.some(c => c.name === prereq)) {
                                    const cObj = groupClasses.find(c => c.name === prereq);
                                    const cCompleted =
                                        completedDict[g] && typeof completedDict[g][prereq] === "boolean"
                                            ? completedDict[g][prereq]
                                            : cObj.completed;
                                    if (!cCompleted) {
                                        unmet.push(prereq);
                                    }
                                    found = true;
                                    break;
                                }
                            }
                            if (!found) {
                                unmet.push(prereq);
                            }
                        }
                        if (unmet.length > 0) {
                            modalMsg.textContent = `Cannot mark "${cls.name}" as completed. Unmet prerequisites: ${unmet.join(", ")}`;
                            modal.style.display = "block";
                            return;
                        }
                    }

                    // Toggle completion status in completedDict
                    if (!completedDict[groupName]) completedDict[groupName] = {};
                    completedDict[groupName][cls.name] = !(
                        completedDict[groupName][cls.name] === true
                    );

                    // Track user toggles
                    if (!userToggled[groupName]) userToggled[groupName] = {};
                    userToggled[groupName][cls.name] = completedDict[groupName][cls.name];

                    // Persist globally
                    if (!globalCompletedDict[groupName]) globalCompletedDict[groupName] = {};
                    globalCompletedDict[groupName][cls.name] = completedDict[groupName][cls.name];

                    // Track toggle order (only when toggled ON and not already in the array)
                    const uniqueKey = `${groupName}|||${cls.name}`;
                    if (completedDict[groupName][cls.name]) {
                        if (!userToggleOrder.includes(uniqueKey)) {
                            userToggleOrder.push(uniqueKey);
                        }
                    } else {
                        // Remove from order if toggled OFF
                        const idx = userToggleOrder.indexOf(uniqueKey);
                        if (idx !== -1) userToggleOrder.splice(idx, 1);
                    }

                    // Update card appearance dynamically
                    const nowCompleted = completedDict[groupName][cls.name];
                    card.style.background = nowCompleted ? '#e0ffe0' : '#ffe0e0';
                    const statusSpan = card.querySelector('.status-text');
                    statusSpan.textContent = nowCompleted ? 'Completed' : 'Incomplete';
                    statusSpan.style.color = nowCompleted ? 'green' : 'red';

                    renderCompletedClasses();
                });

                groupDiv.appendChild(card);
            });

            grid.appendChild(groupDiv);
        });

        renderCompletedClasses();
    }

    button.addEventListener("click", renderDiploma);
    termInput.addEventListener("input", renderCompletedClasses);
    renderDiploma();
});