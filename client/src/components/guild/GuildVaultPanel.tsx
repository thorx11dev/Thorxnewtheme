/**
 * GuildVaultPanel — THORX v3 SHIM
 * Kept for backward import compatibility. All new code routes through
 * UserPortal 3-context logic (simple → Discovery, member → Member, captain → Captain).
 * The "vault" concept is replaced by GPS-based weekly Sunday bonuses.
 */
import { GuildMemberPanel } from "./GuildMemberPanel";

export { GuildMemberPanel as GuildVaultPanel };
export default GuildMemberPanel;
