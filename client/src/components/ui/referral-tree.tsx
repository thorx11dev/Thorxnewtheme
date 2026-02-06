import React, { useMemo } from "react";
import { cn } from "@/lib/utils";
import { Crown } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface NetworkUser {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    rank?: string;
    avatar?: string;
    level: number;
    referredBy: string;
    earningsFromUser: string;
}

interface ReferralTreeProps {
    currentUser: {
        id: string;
        firstName: string;
        lastName: string;
        rank?: string;
        avatar?: string;
    };
    referrals: NetworkUser[];
}

interface TreeNode {
    user: NetworkUser | ReferralTreeProps['currentUser'];
    children: TreeNode[];
    isRoot?: boolean;
}

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
        <div className="w-full flex justify-center bg-[#fdfbf7] p-4 md:p-8 min-h-[400px]">
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

                /* Connectors - Ultra Thin & Light */
                .tf-tree li::before, .tf-tree li::after {
                    content: '';
                    position: absolute; top: 0; right: 50%;
                    border-top: 1px solid #e5e7eb; /* Slate-200 - Very light */
                    width: 50%; height: 20px;
                }
                .tf-tree li::after {
                    right: auto; left: 50%;
                    border-left: 1px solid #e5e7eb;
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
                    border-right: 1px solid #e5e7eb;
                    border-radius: 0;
                }
                .tf-tree li:first-child::after {
                    border-radius: 0;
                }

                /* Downward Line from Parent */
                .tf-tree ul ul::before {
                    content: '';
                    position: absolute; top: 0; left: 50%;
                    border-left: 1px solid #e5e7eb; /* Slate-200 */
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
                        border-left: 1px solid #e5e7eb; /* Subtle indent line */
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

            <div className="tf-tree overflow-x-auto pb-12 w-full flex justify-center">
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
    const initials = `${user.firstName?.[0] || 'U'}${user.lastName?.[0] || ''}`;

    // Determine card colors - Strict Minimalist Palette
    const isCurrentUser = isRoot;

    return (
        <div className={cn(
            "flex flex-col items-center bg-white transition-all duration-300 relative group",
            "w-[120px] md:w-[150px]", // Slightly wider for better breathing room
            "border border-border/60", // Very subtle border default
            "hover:border-primary/50 hover:shadow-sm", // Micro-interactivity
            isCurrentUser
                ? "border-primary/80 shadow-[0_2px_8px_rgba(0,0,0,0.04)]"
                : "rounded-sm" // Slightly sharper corners for modern feel
        )}>
            {/* Minimalist Crown for Root - No background, just icon */}
            {isRoot && (
                <div className="absolute top-2 right-2 text-primary">
                    <Crown className="w-3 h-3 md:w-3.5 md:h-3.5 stroke-[2.5]" />
                </div>
            )}

            {/* Top Section: Avatar */}
            <div className="pt-4 pb-2 flex justify-center w-full">
                <Avatar className={cn(
                    "w-10 h-10 md:w-12 md:h-12",
                    isCurrentUser ? "ring-2 ring-primary/10 ring-offset-2" : "border border-gray-100"
                )}>
                    <AvatarImage src={user.avatar} className="object-cover grayscale hover:grayscale-0 transition-all duration-500" />
                    <AvatarFallback className={cn(
                        "text-[10px] md:text-xs font-medium tracking-wide",
                        "bg-gray-50 text-gray-600"
                    )}>
                        {initials}
                    </AvatarFallback>
                </Avatar>
            </div>

            {/* Info Section */}
            <div className="pb-4 px-3 w-full text-center space-y-1.5">
                <div className="space-y-0.5">
                    <div className="font-semibold text-foreground text-xs md:text-[13px] truncate leading-tight tracking-tight">
                        {user.firstName} {user.lastName}
                    </div>
                </div>

                {/* Minimal Text-Only Badge */}
                <div className={cn(
                    "inline-flex items-center justify-center px-2 py-0.5 rounded text-[9px] font-medium uppercase tracking-[0.1em]",
                    isCurrentUser
                        ? "text-primary border border-primary/20 bg-primary/5"
                        : "text-muted-foreground border border-transparent bg-gray-50/50"
                )}>
                    {user.rank || (isRoot ? "YOU" : "MEMBER")}
                </div>

                {/* Earnings (If any) - Minimal numeric display */}
                {!isRoot && parseFloat(user.earningsFromUser) > 0 && (
                    <div className="text-[10px] font-mono text-gray-500 pt-1">
                        +${user.earningsFromUser}
                    </div>
                )}
            </div>
        </div>
    );
}

