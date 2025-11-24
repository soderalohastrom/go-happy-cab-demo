const View = require('react-native').View;
const Text = require('react-native').Text;
const Image = require('react-native').Image;
const ScrollView = require('react-native').ScrollView;
const FlatList = require('react-native').FlatList;

module.exports = {
    default: {
        createAnimatedComponent: (c) => c,
        View,
        Text,
        Image,
        ScrollView,
        FlatList,
        addWhitelistedNativeProps: () => { },
        addWhitelistedUIProps: () => { },
    },
    useSharedValue: (v) => ({ value: v }),
    useAnimatedStyle: () => ({}),
    useAnimatedProps: () => ({}),
    withSpring: (v) => v,
    withTiming: (v) => v,
    withDecay: (v) => v,
    withDelay: (v) => v,
    withSequence: (v) => v,
    withRepeat: (v) => v,
    runOnJS: (fn) => fn,
    runOnUI: (fn) => fn,
    Easing: {
        linear: (t) => t,
        ease: (t) => t,
        bezier: () => (t) => t,
    },
    // Add other exports as needed
};
