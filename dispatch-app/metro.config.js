const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.resolver.resolveRequest = (context, moduleName, platform) => {
    if (platform === 'web' && moduleName === 'react-native-reanimated') {
        return {
            filePath: __dirname + '/mocks/react-native-reanimated.js',
            type: 'sourceFile',
        };
    }
    return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
