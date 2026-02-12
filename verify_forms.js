import fetch from 'node-fetch';

async function checkForms() {
    try {
        console.log('Fetching forms from http://localhost:5000/api/forms...');
        const response = await fetch('http://localhost:5000/api/forms');

        if (!response.ok) {
            console.error(`Error fetching forms: ${response.status} ${response.statusText}`);
            const text = await response.text();
            console.error('Response body:', text);
            return;
        }

        const forms = await response.json();
        console.log(`Found ${forms.length} forms.`);

        forms.forEach(form => {
            console.log('------------------------------------------------');
            console.log(`ID: ${form.id}`);
            console.log(`Title: ${form.title}`);

            const design = form.designConfig || form.design_config;
            if (design) {
                console.log('Design Config Colors:', JSON.stringify(design.colors, null, 2));
            } else {
                console.log('No design config found.');
            }
        });
        console.log('------------------------------------------------');

    } catch (error) {
        console.error('Failed to connect to API:', error.message);
    }
}

checkForms();
