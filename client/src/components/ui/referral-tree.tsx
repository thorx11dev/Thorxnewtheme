import * as React from "react";
import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { Crown, User, Shield, Medal, Award } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface NetworkUser {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    rank?: string;
    avatar?: string;
    profilePicture?: string;
    level: number;
    referredBy: string;
    earningsFromUser: string;
}

interface ReferralTreeProps {
    currentUser: {
        id: string;
        firstName?: string;
        lastName?: string;
        name?: string;
        rank?: string;
        avatar?: string;
        profilePicture?: string;
    };
    referrals: NetworkUser[];
}

interface TreeNode {
    user: NetworkUser | ReferralTreeProps['currentUser'];
    children: TreeNode[];
    isRoot?: boolean;
}

const AVATARS = [
    { id: "avatar1", url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" },
    { id: "avatar2", url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka" },
    { id: "avatar3", url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Luna" },
    { id: "avatar4", url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Max" },
    { id: "avatar5", url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sophie" },
    { id: "avatar6", url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Oliver" },
    { id: "avatar7", url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Emma" },
    { id: "avatar8", url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Jack" },
    { id: "avatar9", url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Mia" },
    { id: "avatar10", url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Charlie" },
];

const getRankDetails = (rankTitle?: string) => {
    const title = rankTitle?.toUpperCase() || "USELESS";
    // Force silver/zinc style for all ranks as requested
    return { title: title, color: "text-zinc-500", border: "border-zinc-500", bg: "bg-zinc-500" };
};

export function ReferralTree({ currentUser, referrals }: ReferralTreeProps) {
    // Build the tree structure dynamically
    const treeData = useMemo(() => {
        const root: TreeNode = {
            user: currentUser,
            children: [],
            isRoot: true,
        };

        const nodeMap = new Map<string, TreeNode>();
        nodeMap.set(currentUser.id, root);

        // Sort referrals by level to ensure parents exist before children
        const sortedReferrals = [...referrals].sort((a, b) => a.level - b.level);

        // Create nodes
        sortedReferrals.forEach(ref => {
            const newNode: TreeNode = {
                user: ref,
                children: [],
                isRoot: false
            };
            nodeMap.set(ref.id, newNode);
        });

        // Link nodes to parents
        sortedReferrals.forEach(ref => {
            const node = nodeMap.get(ref.id);
            if (node && ref.referredBy) {
                const parent = nodeMap.get(ref.referredBy);
                if (parent) {
                    parent.children.push(node);
                }
            }
        });

        return root;
    }, [currentUser, referrals]);

    return (
        <div className="w-full flex justify-center p-4 md:p-8 min-h-[400px]">
            {/* 
                CSS Tree Implementation 
                - Uses nested lists for hierarchy
                - Pseudo-elements (::before, ::after) for pure CSS connectors
                - "Elbow" style lines (angular, no curves)
             */}
            <style>{`
                /* Tree Container */
                .tf-tree ul {
                    padding-top: 20px; 
                    position: relative;
                    transition: all 0.5s;
                    display: flex;
                    justify-content: center;
                }

                .tf-tree li {
                    float: left; text-align: center;
                    list-style-type: none;
                    position: relative;
                    padding: 20px 5px 0 5px; /* Compact padding */
                    transition: all 0.5s;
                }

                /* Connectors - Bold & Visible */
                .tf-tree li::before, .tf-tree li::after {
                    content: '';
                    position: absolute; top: 0; right: 50%;
                    border-top: 2px solid #d1d5db; /* Gray-300 - Bolder */
                    width: 50%; height: 20px;
                }
                .tf-tree li::after {
                    right: auto; left: 50%;
                    border-left: 2px solid #d1d5db;
                }

                /* Single Child Fixes */
                .tf-tree li:only-child::after, .tf-tree li:only-child::before {
                    display: none;
                }
                .tf-tree li:only-child { 
                    padding-top: 0;
                }

                /* First/Last Child Connector Removal */
                .tf-tree li:first-child::before, .tf-tree li:last-child::after {
                    border: 0 none;
                }
                
                /* Angular Elbow Connectors */
                .tf-tree li:last-child::before {
                    border-right: 2px solid #d1d5db;
                    border-radius: 0;
                }
                .tf-tree li:first-child::after {
                    border-radius: 0;
                }

                /* Downward Line from Parent */
                .tf-tree ul ul::before {
                    content: '';
                    position: absolute; top: 0; left: 50%;
                    border-left: 2px solid #d1d5db; /* Gray-300 */
                    width: 0; height: 20px;
                }

                /* Responsive Mobile Override: Vertical Stack */
                @media (max-width: 768px) {
                    .tf-tree ul {
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        padding-top: 0;
                    }
                    .tf-tree li {
                        padding: 10px 0;
                        float: none;
                        display: block;
                    }
                    /* Hide complex connectors on mobile for cleaner vertical list look */
                    .tf-tree li::before, 
                    .tf-tree li::after, 
                    .tf-tree ul ul::before {
                        display: flow-root; /* Or none, but let's try to keep simple lines or just hide */
                        border: none; 
                    }
                    /* Simple vertical line for mobile if needed, or just stacking */
                    .tf-tree li {
                        border-left: 2px solid #d1d5db; /* Bolder indent line */
                        margin-left: 20px;
                        padding-left: 20px;
                    }
                    .tf-tree > ul > li {
                        border-left: none;
                        margin-left: 0;
                        padding-left: 0;
                    }
                }
            `}</style>

            <div className="tf-tree overflow-visible pb-12 w-full flex justify-center">
                <ul>
                    <TreeNodeComponent node={treeData} />
                </ul>
            </div>
        </div>
    );
}

function TreeNodeComponent({ node }: { node: TreeNode }) {
    const hasChildren = node.children && node.children.length > 0;

    return (
        <li>
            <div className="inline-block relative z-10">
                <NodeCard node={node} isRoot={!!node.isRoot} />
            </div>

            {hasChildren && (
                <ul>
                    {node.children.map((child) => (
                        <TreeNodeComponent key={(child.user as any).id} node={child} />
                    ))}
                </ul>
            )}
        </li>
    );
}

// ----------------------------------------------------------------------
// Node Card Design
// ----------------------------------------------------------------------

// ----------------------------------------------------------------------
// Node Card Design
// ----------------------------------------------------------------------

function NodeCard({ node, isRoot }: { node: TreeNode; isRoot: boolean }) {
    const user = node.user as any;

    const rank = getRankDetails(user.rank);

    let userAvatar = AVATARS[0].url;
    if (user.profilePicture) {
        userAvatar = user.profilePicture;
    } else if (user.avatar) {
        const predefined = AVATARS.find(a => a.id === user.avatar);
        if (predefined) {
            userAvatar = predefined.url;
        } else if (user.avatar !== 'default' && user.avatar.length > 20) {
            userAvatar = user.avatar;
        }
    }

    const isCurrentUser = isRoot;

    return (
        <div className={cn(
            "flex flex-col items-center bg-white transition-all duration-300 relative group",
            "w-[140px] md:w-[180px]", // Slightly wider for the new avatar style
            "border border-black/10", // Very subtle border default
            "hover:border-primary/50 hover:shadow-lg",
            isCurrentUser && "border-primary/40 shadow-sm"
        )}>
            {/* Top Section: Avatar with Comic Border & Rank Badge */}
            <div className="pt-6 pb-2 flex justify-center w-full relative">

                <div className="relative group-hover:scale-105 transition-transform duration-500">
                    <div className={cn(
                        "w-20 h-20 md:w-24 md:h-24 border-4 bg-black overflow-hidden shadow-md rotate-2 group-hover:rotate-0 transition-transform duration-500",
                        rank.border
                    )}>
                        <img
                            src={userAvatar}
                            alt={`${user.firstName} ${user.lastName}`}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                                // Fallback if image fails to load
                                (e.target as HTMLImageElement).src = AVATARS[0].url;
                            }}
                        />
                    </div>
                    {/* Rank Badge - Overlapping bottom right - Match Dashboard exactly */}
                    <div className={cn(
                        "absolute -bottom-2 -right-2 px-2 py-0.5 text-[8px] md:text-[9px] font-black uppercase tracking-widest text-black border-2 border-black shadow-sm z-10",
                        rank.bg
                    )}>
                        {rank.title}
                    </div>
                </div>
            </div>

            {/* Info Section */}
            <div className="pb-4 px-3 w-full text-center space-y-1">
                <div className="space-y-0.5">
                    <div className="font-black text-black text-xs md:text-sm truncate uppercase tracking-tighter">
                        {user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'USER'}
                    </div>
                </div>

                {/* Earnings (If any) - Minimal numeric display */}
                {!isRoot && parseFloat(user.earningsFromUser) > 0 && (
                    <div className="text-[10px] md:text-xs font-mono font-bold text-primary pt-1">
                        +PKR {parseFloat(user.earningsFromUser).toFixed(2)}
                    </div>
                )}

                {/* Level indicators removed as requested */}
            </div>
        </div>
    );
}

