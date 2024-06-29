(function (PLUGIN_ID) {
  window.mermaid.initialize({ startOnLoad: false });

  kintone.events.on('app.record.index.show', async (event) => {
    const viewId = '7458282';
    if (String(event.viewId) !== viewId) {
      return;
    }
    const respApps = await kintone.api(
      kintone.api.url('/k/v1/apps.json', true),
      'GET',
      {}
    );
    const appProperties = {};
    respApps.apps.forEach((app) => {
      appProperties[app.appId] = {
        name: app.name,
      };
    });

    const appIdList = await respApps.apps.map((app) => app.appId);
    await createAppProperties(appProperties, appIdList);

    const replaceDictionary = {};
    const erDiagram = createErDiagram(appProperties, replaceDictionary);
    const content = document.querySelector('#er-diagram');
    const diagram = document.createElement('div');
    diagram.id = 'diagram';
    diagram.className = 'mermaid';
    let { svg } = await mermaid.render('diagram', erDiagram);
    const parser = new DOMParser();
    const svgDoc = parser.parseFromString(svg, 'image/svg+xml');
    const textElements = svgDoc.querySelectorAll('text');
    textElements.forEach(textElem => {
      const originalText = textElem.textContent;
      if (replaceDictionary[originalText]) {
        textElem.textContent = replaceDictionary[originalText];
      }
    });
    const serializer = new XMLSerializer();
    svg = serializer.serializeToString(svgDoc.documentElement);
    diagram.innerHTML = svg;
    // svgを拡大表示
    diagram.style.width = '1000%';
    diagram.style.height = '300%';
    content.appendChild(diagram);
  });

  const createAppProperties = async (appProperties, appIdList) => {
    await Promise.all(
      appIdList.map(async (appId) => {
        const body = {
          app: appId,
          lang: 'ja',
        };
        const respForm = await kintone.api(
          kintone.api.url('/k/v1/app/form/fields.json', true),
          'GET',
          body
        );
        const primaryKeyList = [];
        const foreignKeyList = [];
        Object.keys(respForm.properties).forEach((key) => {
          if (respForm.properties[key].unique) {
            const primaryKey = {
              key: key,
              label: respForm.properties[key].label,
              type: respForm.properties[key].type,
              required: respForm.properties[key].required,
            };
            primaryKeyList.push(primaryKey);
          }
          if (respForm.properties[key].lookup) {
            const foreignKey = {
              key: key,
              label: respForm.properties[key].label,
              type: respForm.properties[key].type,
              required: respForm.properties[key].required,
              relatedApp: respForm.properties[key].lookup.relatedApp.app,
              relatedKeyField: respForm.properties[key].lookup.relatedKeyField,
            };
            foreignKeyList.push(foreignKey);
          }
        });
        appProperties[appId].primaryKeyList = primaryKeyList;
        appProperties[appId].foreignKeyList = foreignKeyList;
        console.log(appId);
        console.log(appProperties);
      })
    );
  };

  const createErDiagram = (appProperties, replaceDictionary) => {
    // PK、FK名がpkappIdだと枠が小さくなるため、調整用の文字列を追加
    const margin = 'aaaaaaaaaaaaaaaaaaaaaaaa';
    let erDiagram = 'erDiagram\n';
    let tableDefinition = '';
    let rerationDefinition = '';
    Object.keys(appProperties).forEach((appId) => {
      const app = appProperties[appId];
      tableDefinition += `  app${appId} {\n`;
      replaceDictionary[`app${appId}`] = app.name;
      app.primaryKeyList.forEach((primaryKey, index) => {
        tableDefinition += `    ${primaryKey.type} pk${appId}${index}${margin} PK\n`;
        replaceDictionary[`pk${appId}${index}${margin}`] = primaryKey.label;
      });
      if (app.primaryKeyList.length === 0) {
        tableDefinition += `    int pk${appId}${margin} PK\n`;
        replaceDictionary[`pk${appId}${margin}`] = 'レコード番号';
      }
      if (app.foreignKeyList.length > 0) {
        app.foreignKeyList.forEach((foreignKey) => {
          tableDefinition += `    ${foreignKey.type} pk${foreignKey.relatedApp}${margin} FK\n`;
          rerationDefinition += `  app${foreignKey.relatedApp} ||--o{ app${appId} : pk${foreignKey.relatedApp}${margin}\n`;
          replaceDictionary[`pk${foreignKey.relatedApp}${margin}`] = foreignKey.label;
        });
      }
      tableDefinition += '  }\n';
    });
    erDiagram += tableDefinition + rerationDefinition;
    return erDiagram;
  };
})(kintone.$PLUGIN_ID);
