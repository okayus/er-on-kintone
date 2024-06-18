(function (PLUGIN_ID) {
  // Mermaid.jsの初期化
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
    // const appProperties = {4:{name:"顧客リスト"},6:{name:"ファイル管理"}}のような形式
    const appProperties = {};
    respApps.apps.forEach((app) => {
      appProperties[app.appId] = {
        name: app.name,
      };
    });

    const appIdList = await respApps.apps.map((app) => app.appId);
    // appPropertiesを作成
    await createAppProperties(appProperties, appIdList);

    // erDiagramを生成
    const erDiagram = createErDiagram(appProperties);
    const content = document.querySelector('#er-diagram');
    const diagram = document.createElement('div');
    diagram.id = 'diagram';
    diagram.className = 'mermaid';
    const { svg } = await mermaid.render('diagram', erDiagram);
    diagram.innerHTML = svg;
    content.appendChild(diagram);
  });

  // appProperties作成処理
  const createAppProperties = async (appProperties, appIdList) => {
    await Promise.all([
      appIdList.forEach(async (appId) => {
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
          appProperties[appId].primaryKeyList = primaryKeyList;
          appProperties[appId].foreignKeyList = foreignKeyList;
        });
        console.log(appId);
        console.log(appProperties);
      })
    ]);
  };

  // appPropertiesからmermaid記法のerDiagramを生成する
  const createErDiagram = (appProperties) => {
    let erDiagram = 'erDiagram\n';
    Object.keys(appProperties).forEach((appId) => {
      const app = appProperties[appId];
      erDiagram += `  ${appId} {\n`;
      app.primaryKeyList.forEach((primaryKey) => {
        erDiagram += `    ${primaryKey.type} ${appId}pk PK\n`;
      });
      if (app.primaryKeyList.length) erDiagram += '    int id PK\n';
      app.foreignKeyList.forEach((foreignKey) => {
        erDiagram += `    ${foreignKey.type} ${foreignKey.relatedApp}pk FK\n`;
      });
      erDiagram += '  }\n';
    });
    return erDiagram;
  };
})(kintone.$PLUGIN_ID);
