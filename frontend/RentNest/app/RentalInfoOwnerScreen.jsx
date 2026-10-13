import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { FontAwesome } from "@expo/vector-icons";
import { detailKey } from "../config/rentalDetails";
import { useRentalDetail } from "../config/useRentalDetail";
import MorphingInfinity from "../components/MorphingInfinity";
import ListingImage from "../components/ListingImage";
import ProfileImage from "../components/ProfileImage";

const RentalInfoOwner = () => {
  const router = useRouter();
  const { listingId, refresh } = useLocalSearchParams();
  const detail = useRentalDetail(
    detailKey("property", listingId),
    true,
    refresh,
  );
  const listing = detail.data;

  const handleTenantPress = (tenantId, listingId) => {
    router.push({
      pathname: "/TenantOverview",
      params: { tenantId, listingId },
    });
  };

  const handleShowRentalListing = () => {
    if (listing) {
      router.push({
        pathname: "/HomeListingScreen",
        params: { listingId: listing.listingID },
      });
    }
  };

  if (!detail.verified && !detail.error) {
    return (
      <View style={styles.loadingContainer}>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={() => router.back()}
          style={styles.loadingBackButton}
        >
          <FontAwesome name="chevron-left" size={18} color="#101820" />
        </TouchableOpacity>
        <MorphingInfinity size={86} color="#2FA84F" />
        <Text accessibilityLiveRegion="polite" style={styles.loadingText}>
          Loading rental info...
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ flexGrow: 1 }}
      refreshControl={
        <RefreshControl
          refreshing={detail.loading && !!listing}
          onRefresh={() => detail.refresh()}
        />
      }
    >
      <View style={styles.titleRow}>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Go back"
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <FontAwesome name="chevron-left" size={18} color="#101820" />
        </TouchableOpacity>
        <Text style={styles.title}>Rental Info</Text>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Refresh rental info"
          disabled={detail.loading}
          onPress={() => detail.refresh()}
          style={styles.refreshButton}
        >
          <Text style={styles.refreshText}>
            {detail.loading && listing ? "Refreshing..." : "Refresh"}
          </Text>
        </TouchableOpacity>
      </View>
      {detail.error ? (
        <View>
          <Text accessibilityRole="alert" style={styles.errorText}>
            {detail.error}
          </Text>
          <TouchableOpacity
            accessibilityRole="button"
            disabled={detail.loading}
            style={styles.refreshButton}
            onPress={() => detail.refresh()}
          >
            <Text style={styles.refreshText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : null}
      {listing && detail.stale ? (
        <Text accessibilityLiveRegion="polite" style={styles.statusText}>
          Showing saved details.{" "}
          {detail.loading
            ? "Checking for updates..."
            : "Refresh to confirm the current tenancy."}
        </Text>
      ) : null}

      {/* Image */}
      {listing && (
        <>
          <ListingImage
            uri={listing.listingpicture}
            style={styles.image}
            screen="RentalInfoOwnerScreen"
            diagnostics={false}
            listingId={listing.listingID}
            listingName={listing.name}
            width={600}
            height={400}
          />

          {/* Listing name and address */}
          <View style={styles.row}>
            <View style={styles.left}>
              <Text style={styles.listingName}>{listing.name}</Text>
              <Text style={styles.listingAddress}>{listing.location}</Text>
            </View>
            <View style={styles.ownerBox}>
              <Text style={styles.ownerText}>Owner</Text>
            </View>
          </View>

          {/* Owner details */}
          <View style={styles.row}>
            <ProfileImage
              uri={listing.ownerPhotoURL}
              name={listing.ownerName}
              style={styles.ownerPhoto}
              textStyle={styles.profilePhotoInitials}
              screen="RentalInfoOwnerScreen"
              diagnostics={false}
              userId={listing.ownerId}
              role="owner"
            />
            <Text style={styles.ownerName}>{listing.ownerName}</Text>
          </View>

          {/* Thin divider */}
          <View style={styles.thinDivider} />

          {/* Tenant and rent details */}
          <View style={styles.detailsRow}>
            <View>
              <Text style={styles.detailsLabel}>Current Tenants:</Text>
              <Text style={styles.detailsValue}>
                {!listing.tenantId ? "No current tenant" : listing.tenantName}
              </Text>
            </View>
            <View style={styles.rightAligned}>
              <Text style={styles.detailsLabel}>Monthly Rental Payment:</Text>
              <Text style={styles.detailsValue}>S${listing.price}</Text>
            </View>
          </View>

          {/* Thick divider container */}
          <View style={styles.thickDividerContainer}>
            <View style={styles.fullWidthDivider} />
          </View>

          {/* Manage Tenants */}
          <Text style={styles.sectionTitle}>Manage Tenant</Text>
          {listing.tenantId ? (
            <TouchableOpacity
              style={[
                styles.transparentButton,
                !detail.verified && styles.disabled,
              ]}
              accessibilityRole="button"
              accessibilityLabel={`Manage tenant ${listing.tenantName || ""}`}
              disabled={!detail.verified}
              accessibilityState={{ disabled: !detail.verified }}
              onPress={() =>
                handleTenantPress(listing.tenantId, listing.listingID)
              }
            >
              <ProfileImage
                uri={listing.tenantPhotoURL}
                name={listing.tenantName}
                style={styles.tenantPhoto}
                textStyle={styles.profilePhotoInitials}
                screen="RentalInfoOwnerScreen"
                diagnostics={false}
                userId={listing.tenantId}
                role="tenant"
              />
              <Text style={styles.buttonText}>{listing.tenantName}</Text>
              <Text style={styles.arrow}>›</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.transparentButton}>
              <ProfileImage
                uri={listing.tenantPhotoURL}
                name={listing.tenantName}
                style={styles.tenantPhoto}
                textStyle={styles.profilePhotoInitials}
                screen="RentalInfoOwnerScreen"
                diagnostics={false}
                userId={listing.tenantId}
                role="tenant"
              />
              <Text style={[styles.buttonText, { color: "#666" }]}>
                No current tenant
              </Text>
            </View>
          )}

          {/* Page break with another thick line */}
          <View style={styles.thickDividerContainer}>
            <View style={styles.fullWidthDivider} />
          </View>

          {/* Rental Listing and Edit Listing Buttons with FontAwesome Icons */}
          <TouchableOpacity
            style={styles.transparentButton}
            onPress={() => handleShowRentalListing()}
          >
            <FontAwesome
              name="list-alt"
              style={[styles.icon, styles.lighterIcon]}
            />
            <Text style={styles.buttonText}>Show Rental Listing</Text>
            <Text style={styles.arrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            disabled={!detail.verified}
            accessibilityRole="button"
            accessibilityLabel="Edit Listing"
            accessibilityState={{ disabled: !detail.verified }}
            style={[
              styles.transparentButton,
              !detail.verified && styles.disabled,
            ]}
            onPress={() =>
              router.replace({
                pathname: "/EditListingScreen",
                params: { listingId },
              })
            }
          >
            <FontAwesome
              name="edit"
              style={[styles.icon, styles.lighterIcon]}
            />
            <Text style={styles.buttonText}>Edit Listing</Text>
            <Text style={styles.arrow}>›</Text>
          </TouchableOpacity>
        </>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    paddingHorizontal: 20,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F7F8FA",
  },
  loadingText: {
    marginTop: 24,
    color: "#101820",
    fontSize: 18,
    fontWeight: "700",
  },
  loadingBackButton: {
    position: "absolute",
    top: 48,
    left: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F0F0F0",
    marginRight: 12,
  },
  title: {
    flex: 1,
    fontSize: 24,
    fontWeight: "bold",
  },
  refreshButton: {
    minHeight: 48,
    paddingHorizontal: 8,
    justifyContent: "center",
  },
  refreshText: { color: "#205C43", fontSize: 14, fontWeight: "600" },
  errorText: { color: "#9B263D", fontSize: 16, lineHeight: 24 },
  statusText: { color: "#555", fontSize: 14, marginBottom: 12 },
  disabled: { opacity: 0.5 },
  image: {
    width: "100%",
    height: 200,
    borderRadius: 10,
    marginBottom: 20,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  left: {
    flexDirection: "column",
    flex: 1,
    marginRight: 10,
  },
  listingName: {
    fontSize: 20,
    fontWeight: "bold",
  },
  listingAddress: {
    fontSize: 16,
    color: "#666",
  },
  ownerBox: {
    backgroundColor: "black",
    padding: 5,
    borderRadius: 5,
  },
  ownerText: {
    color: "#fff",
    fontWeight: "bold",
  },
  ownerPhoto: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  ownerName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
  },
  detailsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 10,
  },
  detailsLabel: {
    fontSize: 14,
    color: "#333",
    fontWeight: "bold",
  },
  detailsValue: {
    fontSize: 14,
    color: "#666",
  },
  rightAligned: {
    alignItems: "flex-end",
  },
  thinDivider: {
    height: 1,
    backgroundColor: "#ddd",
    width: "100%",
    marginVertical: 10, // Keep margin around thin dividers
  },
  thickDividerContainer: {
    position: "relative",
    width: "100%",
    marginVertical: 15, // Margin for spacing around the thick divider
  },
  fullWidthDivider: {
    height: 10,
    backgroundColor: "#EAEAEA",
    position: "absolute",
    left: -0,
    right: 0,
    top: 0,
    marginLeft: -20, // Adjust based on the padding of the container
    marginRight: -20, // Adjust based on the padding of the container
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
  },
  transparentButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    backgroundColor: "transparent",
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
  },
  tenantPhoto: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  profilePhotoInitials: {
    fontSize: 14,
  },
  buttonText: {
    flex: 1,
    fontSize: 16,
  },
  arrow: {
    fontSize: 18,
    color: "#ccc",
  },
  icon: {
    fontSize: 24, // Adjust the size of the FontAwesome icons as needed
    marginRight: 10, // Space between icon and text
  },
  lighterIcon: {
    opacity: 0.6, // Adjust the opacity for lighter appearance
  },
});

export default RentalInfoOwner;
