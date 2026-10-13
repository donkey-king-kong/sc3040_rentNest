import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { test } from 'node:test';
import { transformSync } from '@babel/core';
import React from 'react';

// Run: node --test scripts/startup-routing.test.mjs
// Checks the real layout configuration without loading native modules.
const require = createRequire(import.meta.url);
const Stack = Object.assign(() => null, { Screen: () => null });
const Redirect = () => null;
const insets = { top: 24, right: 0, bottom: 16, left: 0 };
const mocks = {
  'react/jsx-runtime': require('react/jsx-runtime'),
  'expo-router': { Stack, Redirect },
  'react-native-safe-area-context': {
    SafeAreaProvider: ({ children }) => children,
    useSafeAreaInsets: () => insets,
  },
};

function loadScreen(name) {
  const filename = new URL(`../app/${name}.jsx`, import.meta.url);
  const { code } = transformSync(readFileSync(filename, 'utf8'), {
    filename: filename.pathname,
    babelrc: false,
    configFile: false,
    plugins: [
      [require.resolve('@babel/plugin-transform-react-jsx'), { runtime: 'automatic' }],
      require.resolve('@babel/plugin-transform-modules-commonjs'),
    ],
  });
  const module = { exports: {} };
  new Function('require', 'module', 'exports', code)(specifier => {
    assert.ok(Object.hasOwn(mocks, specifier), `Unexpected import: ${specifier}`);
    return mocks[specifier];
  }, module, module.exports);
  return module.exports.default;
}

function rootStack() {
  const provider = loadScreen('_layout')();
  assert.equal(provider.type, mocks['react-native-safe-area-context'].SafeAreaProvider);
  const root = provider.props.children;
  return root.type(root.props);
}

test('native stack explicitly starts at index instead of the admin screen', () => {
  const stack = rootStack();
  assert.equal(stack.type, Stack);
  assert.equal(stack.props.initialRouteName, 'index');
  assert.equal(React.Children.toArray(stack.props.children)[0].props.name, 'index');
});

test('index always redirects to Landing without consulting saved authentication', () => {
  // Storage is deliberately not available in the import allowlist.
  const redirect = loadScreen('index')();
  assert.equal(redirect.type, Redirect);
  assert.equal(redirect.props.href, '/LandingScreen');
});

test('admin remains registered with its existing safe-area styling', () => {
  const stack = rootStack();
  const admin = React.Children.toArray(stack.props.children)
    .find(screen => screen.props.name === 'AdminScreen');
  assert.ok(admin);
  assert.equal(admin.type, Stack.Screen);
  assert.deepEqual(admin.props.options.contentStyle, {
    paddingTop: insets.top,
    backgroundColor: '#FFFFFF',
  });
  assert.equal(stack.props.screenOptions.headerShown, false);
  assert.deepEqual(stack.props.screenOptions.contentStyle, {
    paddingTop: insets.top,
    backgroundColor: '#F7F8FA',
  });
});
