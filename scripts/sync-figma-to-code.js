const axios = require('axios');
const fs = require('fs');

async function syncComponent(fileKey, componentName) {
  // 1. Fetch file data from Figma
  const response = await axios.get(`https://api.github.com/v1/files/${fileKey}`, {
    headers: { 'X-Figma-Token': process.env.FIGMA_ACCESS_TOKEN }
  });

  // 2. Find the Component Set (the container for variants)
  const componentSet = Object.values(response.data.components).find(
    c => c.name === componentName
  );

  // 3. Extract properties
  const figmaProps = componentSet.componentPropertyDefinitions;
  
  // 4. Generate the React Prop Interface
  const propInterface = Object.entries(figmaProps).map(([name, def]) => {
    const type = def.type === 'BOOLEAN' ? 'boolean' : 'string';
    return `  ${name}?: ${type};`;
  }).join('\n');

  // 5. Generate the Component Code
  const template = `
import React from 'react';
import './${componentName}.css';

export interface ${componentName}Props {
${propInterface}
  children?: React.ReactNode;
}

export const ${componentName}: React.FC<${componentName}Props> = ({ 
  ${Object.keys(figmaProps).join(', ')}, 
  children,
  ...props 
}) => {
  return (
    <div className="${componentName.toLowerCase()}" {...props}>
      {children}
    </div>
  );
};`;

  fs.writeFileSync(`./src/components/${componentName}.tsx`, template);
}
