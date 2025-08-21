class Diploma {
    constructor(name, term) {
        this.name = name;
        this.term = term;
        this.classes = [];
        this.requirements = [];
    }

    async initClasses(data = null) {
        this.classes = [];
        if (!data) {
            const res = await fetch(`info.json`);
            data = await res.json();
        }
        const degreeData = data[this.name];
        if (degreeData) {
            this.requirements = degreeData.requirements || [];
            Object.entries(degreeData)
                .filter(([key]) => key !== "requirements")
                .forEach(([className, classInfo]) => {
                    this.classes.push({
                        name: className,
                        credits: classInfo.credits,
                        prerequisites: classInfo.prerequisites || [],
                        completed: classInfo.completed || false
                    });
                });
        }
        return data;
    }

    async getRequiredGroups(data = null) {
        data = await this.initClasses(data);
        let groups = [];
        if (this.requirements.length > 0) {
            for (const req of this.requirements) {
                const diploma = new Diploma(req);
                const subGroups = await diploma.getRequiredGroups(data);
                groups = groups.concat(subGroups);
            }
        } else {
            groups = [this.name];
        }
        return groups;
    }

    async getGroupedClasses(data = null) {
        if (!data) {
            const res = await fetch(`info.json`);
            data = await res.json();
        }
        const groups = await this.getRequiredGroups(data);
        const grouped = {};
        let generalEducationClasses = [];

        for (const group of groups) {
            const groupData = data[group];
            if (!groupData) continue;
            
            if (group.startsWith("GeneralEducation")) {
                Object.entries(groupData)
                    .filter(([key]) => key !== "requirements")
                    .forEach(([className, classInfo]) => {
                        generalEducationClasses.push({
                            name: className,
                            credits: classInfo.credits,
                            prerequisites: classInfo.prerequisites || [],
                            completed: classInfo.completed || false
                        });
                    });
            } else {
                grouped[group] = [];
                Object.entries(groupData)
                    .filter(([key]) => key !== "requirements")
                    .forEach(([className, classInfo]) => {
                        grouped[group].push({
                            name: className,
                            credits: classInfo.credits,
                            prerequisites: classInfo.prerequisites || [],
                            completed: classInfo.completed || false
                        });
                    });
            }
        }

        if (generalEducationClasses.length > 0) {
            grouped["General Education"] = generalEducationClasses;
        }

        return grouped;
    }

    async injectGrid(selector, titleClass = 'diploma-title') {
        const grid = document.querySelector(selector);
        if (!grid) return;

        grid.innerHTML = "";

        const groupedClasses = await this.getGroupedClasses();

        Object.entries(groupedClasses).forEach(([groupName, classes]) => {
            const groupDiv = document.createElement('div');
            groupDiv.className = 'group-div';

            const groupHeading = document.createElement('h3');
            groupHeading.textContent = groupName;
            groupDiv.appendChild(groupHeading);

            classes.forEach(cls => {
                const card = document.createElement('div');
                card.className = 'class-card';
                card.style.border = '1px solid #ccc';
                card.style.padding = '0.5rem';
                card.style.background = cls.completed ? '#e0ffe0' : '#ffe0e0';

                card.innerHTML = `
                    <strong>${cls.name}</strong><br>
                    Credits: ${cls.credits}<br>
                    Prerequisites: ${cls.prerequisites && cls.prerequisites.length ? cls.prerequisites.join(', ') : 'None'}<br>
                    Status: <span style="font-weight:bold;color:${cls.completed ? 'green' : 'red'}">${cls.completed ? 'Completed' : 'Incomplete'}</span>
                `;
                groupDiv.appendChild(card);
            });

            grid.appendChild(groupDiv);
        });
    }
}

export { Diploma };