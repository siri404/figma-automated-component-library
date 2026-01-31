const axios = require('axios');
const fs = require('fs');
const path = require('path');

async function syncComponent() {
  // Grab inputs from GitHub Action environment variables or arguments
  const fileKey = process.argv[2] || process.env.FIGMA_FILE_KEY;
  const componentName = process.argv[3] || process.env.COMPONENT_NAME;

  try {
    console.log(`Fetching component ${componentName} from Figma file ${fileKey}...`);

    // 1. Correct Figma API URL
    const response = await axios.get(`https://api.figma.com/v1/files/${fileKey}`, {
      headers: { 'X-Figma-Token': (process.env.FIGMA_TOKEN || '').trim() }
    });

    // 2. Find the Component Set
    const componentSet = Object.values(response.data.components).find(
      c => c.name === componentName
    );

    if (!componentSet) {
      throw new Error(`Component "${componentName}" not found in Figma file.`);
    }

    const figmaProps = componentSet.componentPropertyDefinitions || {};
    
    // 3. Generate Props
    const propInterface = Object.entries(figmaProps).map(([name, def]) => {
      const cleanName = name.split('#')[0]; // Figma sometimes adds IDs to names
      const type = def.type === 'BOOLEAN' ? 'boolean' : 'string';
      return `  ${cleanName}?: ${type};`;
    }).join('\n');

    // 4. Generate Template
    const template = `import React from 'react';

export interface ${componentName}Props {
${propInterface}
  children?: React.ReactNode;
}

export const ${componentName}: React.FC<${componentName}Props> = ({ 
  ${Object.keys(figmaProps).map(n => n.split('#')[0]).join(', ')}, 
  children,
  ...props 
}) => {
  return (
    <div className="${componentName.toLowerCase()}" {...props}>
      {children}
    </div>
  );
};`;

    // 5. Ensure directory exists and write file
    const dir = './src/components';
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(`${dir}/${componentName}.tsx`, template);
    console.log(`✅ Successfully generated ${componentName}.tsx`);

  } catch (error) {
    console.error("❌ Sync failed:", error.message);
    process.exit(1); // Tell GitHub Actions that the script failed
  }
}

// CRITICAL: Actually run the function!
syncComponent();