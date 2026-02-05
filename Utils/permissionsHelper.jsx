import { doc, getDoc } from "firebase/firestore";
import { db, auth } from "../firebase";

/**
 * Check if a user has a specific permission
 * @param {string} userRole - The role of the user (e.g., "Union President")
 * @param {string} permissionKey - The permission key to check (e.g., "addEditMembers")
 * @returns {Promise<boolean>} - Returns true if user has permission
 */
export const checkPermission = async (userRole, permissionKey) => {
  try {
    // Admin always has all permissions
    if (userRole?.toLowerCase() === "admin") {
      return true;
    }

    const permissionsRef = doc(db, "settings", "rolePermissions");
    const permissionsDoc = await getDoc(permissionsRef);

    if (!permissionsDoc.exists()) {
      console.warn("Permissions document not found in Firestore");
      return false;
    }

    const permissions = permissionsDoc.data();

    // First check the "all" role
    if (permissions.all && permissions.all[permissionKey] === 1) {
      return true;
    }

    // Check specific role
    if (permissions[userRole] && permissions[userRole][permissionKey] === 1) {
      return true;
    }

    return false;
  } catch (error) {
    console.error("Error checking permission:", error);

    // If there's a permission error, deny access for safety
    if (error.code === "permission-denied") {
      console.error("Permission denied accessing permissions document");
    }

    return false; // Default to no permission on error
  }
};

/**
 * Get all permissions for a specific user role
 * @param {string} userRole - The role of the user
 * @returns {Promise<Object>} - Returns an object with all permissions as booleans
 */
export const getAllPermissions = async (userRole) => {
  try {
    // Default permissions object (all false)
    const defaultPermissions = {
      addEditMembers: false,
      collectPayments: false,
      addDues: false,
      addContribution: false,
      addMisc: false,
      addBudget: false,
      makeWithdrawal: false,
      addEvents: false,
      addMinutesReports: false,
    };

    // Admin always has all permissions
    if (userRole?.toLowerCase() === "admin") {
      return Object.keys(defaultPermissions).reduce((acc, key) => {
        acc[key] = true;
        return acc;
      }, {});
    }

    const permissionsRef = doc(db, "settings", "rolePermissions");
    const permissionsDoc = await getDoc(permissionsRef);

    if (!permissionsDoc.exists()) {
      console.warn(
        "Permissions document not found, returning default permissions"
      );
      return defaultPermissions;
    }

    const permissions = permissionsDoc.data();
    const result = { ...defaultPermissions };

    // First apply "all" role permissions
    if (permissions.all) {
      Object.keys(result).forEach((key) => {
        if (permissions.all[key] !== undefined) {
          result[key] = permissions.all[key] === 1;
        }
      });
    }

    // Then override with specific role permissions
    if (permissions[userRole]) {
      Object.keys(result).forEach((key) => {
        if (permissions[userRole][key] !== undefined) {
          result[key] = permissions[userRole][key] === 1;
        }
      });
    }

    return result;
  } catch (error) {
    console.error("Error getting all permissions:", error);

    // Return default permissions (all false) on error
    return {
      addEditMembers: false,
      collectPayments: false,
      addDues: false,
      addContribution: false,
      addMisc: false,
      addBudget: false,
      makeWithdrawal: false,
      addEvents: false,
      addMinutesReports: false,
    };
  }
};

/**
 * Get current user's role and check a specific permission
 * This is a convenience function that gets user role and checks permission in one call
 * @param {string} permissionKey - The permission key to check
 * @returns {Promise<{hasPermission: boolean, userRole: string}>}
 */
export const checkCurrentUserPermission = async (permissionKey) => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      return { hasPermission: false, userRole: null };
    }

    // Get user document
    const userRef = doc(db, "users", currentUser.uid);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      return { hasPermission: false, userRole: null };
    }

    const userData = userDoc.data();
    const userRole = userData.role || "member";

    const hasPermission = await checkPermission(userRole, permissionKey);

    return { hasPermission, userRole };
  } catch (error) {
    console.error("Error checking current user permission:", error);
    return { hasPermission: false, userRole: null };
  }
};

/**
 * Check if user can access a specific feature with an optional fallback
 * @param {string} userRole - User's role
 * @param {string} permissionKey - Permission key to check
 * @param {boolean} fallbackIfNoPermissions - What to return if permissions document doesn't exist
 * @returns {Promise<boolean>}
 */
export const canAccessFeature = async (
  userRole,
  permissionKey,
  fallbackIfNoPermissions = false
) => {
  try {
    const permissionsRef = doc(db, "settings", "rolePermissions");
    const permissionsDoc = await getDoc(permissionsRef);

    if (!permissionsDoc.exists()) {
      console.warn("Permissions document not found, using fallback");
      return fallbackIfNoPermissions;
    }

    return await checkPermission(userRole, permissionKey);
  } catch (error) {
    console.error("Error checking feature access:", error);
    return fallbackIfNoPermissions;
  }
};

/**
 * Utility function to show permission denied alert/message
 * @param {string} featureName - Name of the feature user is trying to access
 * @param {Function} showAlert - Your alert function from components
 */
export const showPermissionDeniedAlert = (featureName, showAlert) => {
  showAlert(
    "Access Denied",
    `You don't have permission to ${featureName}. Please contact an administrator.`,
    "danger"
  );
};

/**
 * Create a hook-like function for checking permissions in components
 * This can be used in functional components
 */
export const usePermissions = (userRole) => {
  const [permissions, setPermissions] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadPermissions = async () => {
      if (!userRole) {
        setLoading(false);
        return;
      }

      try {
        const userPermissions = await getAllPermissions(userRole);
        setPermissions(userPermissions);
      } catch (error) {
        console.error("Error loading permissions in hook:", error);
      } finally {
        setLoading(false);
      }
    };

    loadPermissions();
  }, [userRole]);

  const hasPermission = (permissionKey) => {
    return permissions[permissionKey] || false;
  };

  return { permissions, loading, hasPermission };
};
