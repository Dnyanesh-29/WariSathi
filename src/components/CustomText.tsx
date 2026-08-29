import React from 'react';
import { Text as RNText, TextProps, StyleSheet } from 'react-native';

export function Text(props: TextProps) {
  return (
    <RNText {...props} style={[styles.defaultText, props.style]}>
      {props.children}
    </RNText>
  );
}

const styles = StyleSheet.create({
  defaultText: {
    fontFamily: 'Poppins_400Regular',
  },
});
