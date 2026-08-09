import noHardwareFingerprinting from "./noHardwareFingerprinting.js";
import noSystemIdentity from "./noSystemIdentity.js";
import noElectronIpc from "./noElectronIpc.js";
import clipboardAccess from "./clipboardAccess.js";
import noLocalStorage from "./noLocalStorage.js";
import vaultRead from "./vaultRead.js";
import vaultWrite from "./vaultWrite.js";
import vaultEnumeration from "./vaultEnumeration.js";
import noSelfDisableEnable from "./noSelfDisableEnable.js";
import noSelfUpdate from "./noSelfUpdate.js";
import noPeriodicNetwork from "./noPeriodicNetwork.js";
import noFilesystemAccess from "./noFilesystemAccess.js";
import noShellExecution from "./noShellExecution.js";

export const behavior = {
	noHardwareFingerprinting,
	noSystemIdentity,
	noElectronIpc,
	clipboardAccess,
	noLocalStorage,
	vaultRead,
	vaultWrite,
	vaultEnumeration,
	noSelfDisableEnable,
	noSelfUpdate,
	noPeriodicNetwork,
	noFilesystemAccess,
	noShellExecution,
};
