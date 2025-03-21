import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

export function AcceptInvitePage() {
    const [searchParams] = useSearchParams();
    const token = searchParams.get("token");
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isValidating, setIsValidating] = useState(true);
    const [isTokenValid, setIsTokenValid] = useState(false);
    const [tokenError, setTokenError] = useState("");
    const navigate = useNavigate();
    const { toast } = useToast();

    useEffect(() => {
        if (!token) {
            toast({
                title: "Invalid Invitation",
                description: "No invitation token provided.",
                variant: "destructive",
            });
            navigate("/login");
            return;
        }

        // Validate the token
        const validateToken = async () => {
            setIsValidating(true);
            try {
                const response = await fetch(`${import.meta.env.VITE_API_URL}/api/validate-invitation-token`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ token }),
                });

                const data = await response.json();
                
                if (response.ok) {
                    setIsTokenValid(data.valid);
                    if (!data.valid) {
                        setTokenError(data.reason || "Invalid invitation token");
                    }
                } else {
                    setIsTokenValid(false);
                    setTokenError("Failed to validate invitation token");
                }
            } catch (error) {
                setIsTokenValid(false);
                setTokenError("Failed to validate invitation token");
            } finally {
                setIsValidating(false);
            }
        };

        validateToken();
    }, [token, navigate, toast]);

    const handleSave = async () => {
        if (!token) return;
        
        // Validate first name and last name
        if (!firstName.trim()) {
            toast({
                title: "First Name Required",
                description: "Please enter your first name.",
                variant: "destructive",
            });
            return;
        }

        if (!lastName.trim()) {
            toast({
                title: "Last Name Required",
                description: "Please enter your last name.",
                variant: "destructive",
            });
            return;
        }
        
        if (password.length < 8) {
            toast({
                title: "Invalid Password",
                description: "Password must be at least 8 characters long.",
                variant: "destructive",
            });
            return;
        }

        if (password !== confirmPassword) {
            toast({
                title: "Passwords Do Not Match",
                description: "Please ensure both passwords match.",
                variant: "destructive",
            });
            return;
        }

        setIsLoading(true);
        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL}/api/accept-invitation`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    token,
                    firstName,
                    lastName,
                    newPassword: password,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || "Failed to accept invitation");
            }

            toast({
                title: "Success",
                description: "Your account has been set up successfully.",
            });

            window.location.href = import.meta.env.MODE === 'development'
                ? 'http://portal.localhost:5173/rdm'
                : 'https://portal.primith.com/rdm'
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message || "Failed to accept invitation. Please try again.",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    if (isValidating) {
        return (
            <div className="min-h-screen w-full flex items-center justify-center p-4">
                <Card className="w-full max-w-md">
                    <CardHeader>
                        <CardTitle>Validating Invitation</CardTitle>
                        <CardDescription>
                            Please wait while we validate your invitation...
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex justify-center py-6">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (!isTokenValid) {
        return (
            <div className="min-h-screen w-full flex items-center justify-center p-4">
                <Card className="w-full max-w-md">
                    <CardHeader>
                        <CardTitle>Invalid Invitation</CardTitle>
                        <CardDescription>
                            {tokenError || "This invitation link is no longer valid."}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="text-center py-4">
                        <p className="mb-4">If you already completed your account setup, you can log in using your credentials.</p>
                        <Button 
                            variant="outline" 
                            onClick={() => navigate("/login")}
                            className="mx-auto"
                        >
                            Go to Login
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen w-full flex items-center justify-center p-4">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle>Accept Invitation</CardTitle>
                    <CardDescription>
                        Welcome to Primith! Complete your account setup below.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="firstName">First Name</Label>
                        <Input
                            id="firstName"
                            type="text"
                            placeholder="Enter your first name"
                            value={firstName}
                            onChange={(e) => setFirstName(e.target.value)}
                            disabled={isLoading}
                            required
                        />
                    </div>
                    
                    <div className="space-y-2">
                        <Label htmlFor="lastName">Last Name</Label>
                        <Input
                            id="lastName"
                            type="text"
                            placeholder="Enter your last name"
                            value={lastName}
                            onChange={(e) => setLastName(e.target.value)}
                            disabled={isLoading}
                            required
                        />
                    </div>
                    
                    <div className="space-y-2">
                        <Label htmlFor="password">New Password</Label>
                        <Input
                            id="password"
                            type="password"
                            placeholder="Enter your new password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            disabled={isLoading}
                            required
                        />
                        <p className="text-sm text-muted-foreground">
                            Password must be at least 8 characters long
                        </p>
                    </div>
                    
                    <div className="space-y-2">
                        <Label htmlFor="confirmPassword">Confirm Password</Label>
                        <Input
                            id="confirmPassword"
                            type="password"
                            placeholder="Confirm your password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            disabled={isLoading}
                            required
                        />
                        {password && confirmPassword && password !== confirmPassword && (
                            <p className="text-sm text-destructive">
                                Passwords do not match
                            </p>
                        )}
                    </div>
                </CardContent>
                <CardFooter className="flex justify-end">
                    <Button
                        onClick={handleSave}
                        disabled={
                            isLoading || 
                            !firstName.trim() || 
                            !lastName.trim() || 
                            password.length < 8 || 
                            password !== confirmPassword
                        }
                    >
                        {isLoading ? "Processing..." : "Complete Setup"}
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}