import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";

// Inline dropdown: the option list expands directly below the trigger
// instead of opening a native popup or modal.
const Dropdown = ({ label, options, value, onChange, style }) => {
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.value === value) || options[0];

  return (
    <View style={[styles.wrapper, style]}>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${selected.label}`}
        accessibilityState={{ expanded: open }}
        style={[styles.trigger, open && styles.triggerOpen]}
        onPress={() => setOpen(!open)}
      >
        <Text style={styles.triggerText} numberOfLines={1}>
          {selected.label}
        </Text>
        <Feather
          name={open ? "chevron-up" : "chevron-down"}
          size={16}
          color="#333"
        />
      </TouchableOpacity>
      {open && (
        <View style={styles.menu} accessibilityRole="menu">
          {options.map((option) => {
            const isSelected = option.value === selected.value;
            return (
              <TouchableOpacity
                key={option.value}
                accessibilityRole="menuitem"
                accessibilityState={{ selected: isSelected }}
                style={[styles.option, isSelected && styles.optionSelected]}
                onPress={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
              >
                <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>
                  {option.label}
                </Text>
                {isSelected && <Feather name="check" size={15} color="#205c43" />}
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: { minWidth: 150 },
  trigger: {
    height: 40,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: "#aaa",
    borderRadius: 8,
    backgroundColor: "#fff",
  },
  triggerOpen: { borderColor: "#205c43" },
  triggerText: { fontSize: 14, color: "#222", flexShrink: 1 },
  menu: {
    marginTop: 4,
    borderWidth: 1,
    borderColor: "#aaa",
    borderRadius: 8,
    backgroundColor: "#fff",
    overflow: "hidden",
  },
  option: {
    minHeight: 40,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    paddingHorizontal: 10,
  },
  optionSelected: { backgroundColor: "#d8eee0" },
  optionText: { fontSize: 14, color: "#222", flexShrink: 1 },
  optionTextSelected: { color: "#205c43", fontWeight: "600" },
});

export default Dropdown;
