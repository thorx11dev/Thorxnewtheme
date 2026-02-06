import { Link } from "wouter";
import { Shield, Lock, FileText, Mail } from "lucide-react";

export default function Footer() {
    const currentYear = new Date().getFullYear();

    return (
        <footer className="bg-black text-white border-t-4 border-primary">
            <div className="max-w-7xl mx-auto px-4 py-12">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                    {/* Brand */}
                    <div>
                        <h3 className="text-2xl font-black mb-4">THORX</h3>
                        <p className="text-gray-400 text-sm">
                            Earn money by watching ads, completing tasks, and referring friends.
                        </p>
                    </div>

                    {/* Legal */}
                    <div>
                        <h4 className="text-lg font-black mb-4 flex items-center gap-2">
                            <FileText className="h-5 w-5 text-primary" />
                            LEGAL
                        </h4>
                        <ul className="space-y-2">
                            <li>
                                <Link href="/terms">
                                    <a className="text-gray-400 hover:text-primary transition-colors text-sm">
                                        Terms & Conditions
                                    </a>
                                </Link>
                            </li>
                            <li>
                                <Link href="/privacy">
                                    <a className="text-gray-400 hover:text-primary transition-colors text-sm">
                                        Privacy Policy
                                    </a>
                                </Link>
                            </li>
                        </ul>
                    </div>

                    {/* Security */}
                    <div>
                        <h4 className="text-lg font-black mb-4 flex items-center gap-2">
                            <Shield className="h-5 w-5 text-primary" />
                            SECURITY
                        </h4>
                        <ul className="space-y-2 text-gray-400 text-sm">
                            <li className="flex items-center gap-2">
                                <Lock className="h-4 w-4" />
                                SSL Encrypted
                            </li>
                            <li className="flex items-center gap-2">
                                <Shield className="h-4 w-4" />
                                Secure Payments
                            </li>
                            <li className="flex items-center gap-2">
                                <Shield className="h-4 w-4" />
                                Data Protected
                            </li>
                        </ul>
                    </div>

                    {/* Contact */}
                    <div>
                        <h4 className="text-lg font-black mb-4 flex items-center gap-2">
                            <Mail className="h-5 w-5 text-primary" />
                            CONTACT
                        </h4>
                        <ul className="space-y-2 text-gray-400 text-sm">
                            <li>support@thorx.com</li>
                            <li>privacy@thorx.com</li>
                            <li>Pakistan</li>
                        </ul>
                    </div>
                </div>

                {/* Bottom Bar */}
                <div className="mt-12 pt-8 border-t border-gray-800">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                        <p className="text-gray-400 text-sm">
                            © {currentYear} THORX. All rights reserved.
                        </p>
                        <div className="flex gap-6 text-sm">
                            <Link href="/terms">
                                <a className="text-gray-400 hover:text-primary transition-colors">
                                    Terms
                                </a>
                            </Link>
                            <Link href="/privacy">
                                <a className="text-gray-400 hover:text-primary transition-colors">
                                    Privacy
                                </a>
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    );
}
