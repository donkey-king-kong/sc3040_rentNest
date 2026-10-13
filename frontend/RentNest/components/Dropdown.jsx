import React, { useRef, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { Feather } from "@expo/vector-icons";

const Dropdown = ({ label, options, value, onChange, style }) => {
  const [open, setOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState(null);
  const triggerRef = useRef(null);
  const overlayRef = useRef(null);
  const selected = options.find((option) => option.value === value) || options[0];

  const close = () => {
    setOpen(false);
    setMenuPosition(null);
  };

  const positionMenu = () => {
    triggerRef.current?.measureInWindow((x, y, width, height) => {
      overlayRef.current?.measureInWindow((overlayX, overlayY, overlayWidth, overlayHeight) => {
        // Use overlay-relative coordinates to account for native safe areas.
        const gap = 4;
        const inset = 8;
        const triggerTop = y - overlayY;
        const triggerBottom = triggerTop + height;
        const below = Math.max(0, overlayHeight - triggerBottom - gap - inset);
        const above = Math.max(0, triggerTop - gap - inset);
        const openAbove = below < options.length * 44 + 2 && above > below;
        const menuWidth = Math.min(width, overlayWidth - inset * 2);

        setMenuPosition({
          left: Math.max(inset, Math.min(x - overlayX, overlayWidth - menuWidth - inset)),
          width: menuWidth,
          maxHeight: openAbove ? above : below,
          ...(openAbove
            ? { bottom: overlayHeight - triggerTop + gap }
            : { top: triggerBottom + gap }),
        });
      });
    });
  };

  return (
    <View style={[styles.wrapper, style]}>
      <TouchableOpacity
        ref={triggerRef}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${selected.label}`}
        accessibilityState={{ expanded: open }}
        style={[styles.trigger, open && styles.triggerOpen]}
        onPress={() => setOpen(true)}
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
        <Modal
          transparent
          animationType="none"
          presentationStyle="overFullScreen"
          visible
          onShow={positionMenu}
          onRequestClose={close}
        >
          <View
            ref={overlayRef}
            collapsable={false}
            style={styles.overlay}
            onLayout={positionMenu}
            onAccessibilityEscape={close}
          >
            <Pressable
              style={StyleSheet.absoluteFill}
              accessibilityRole="button"
              accessibilityLabel={`Close ${label} options`}
              onPress={close}
            />
            {menuPosition && (
              <View
                style={[styles.menu, menuPosition]}
                accessibilityRole="menu"
                accessibilityLabel={label}
              >
                <ScrollView bounces={false} keyboardShouldPersistTaps="handled">
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
                          close();
                        }}
                      >
                        <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>
                          {option.label}
                        </Text>
                        {isSelected && <Feather name="check" size={15} color="#205c43" />}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            )}
          </View>
        </Modal>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: { minWidth: 170 },
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
  overlay: { flex: 1 },
  menu: {
    position: "absolute",
    borderWidth: 1,
    borderColor: "#aaa",
    borderRadius: 8,
    backgroundColor: "#fff",
    overflow: "hidden",
  },
  option: {
    minHeight: 44,
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
