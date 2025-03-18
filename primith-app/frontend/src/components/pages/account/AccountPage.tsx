import { useState, useRef, FormEvent, ChangeEvent, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useToast } from "@/hooks/use-toast"
import AuthService from "@/services/auth"
import { User, ArrowLeft, CircleUser, Camera, Trash2 } from "lucide-react"
import { useNavigate } from "react-router-dom"

interface FormData {
  firstName: string;
  lastName: string;
  email: string;
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

interface FormErrors {
  firstName?: string;
  lastName?: string;
  email?: string;
  currentPassword?: string;
  newPassword?: string;
  confirmPassword?: string;
}

export function AccountPage() {
  const { toast } = useToast()
  const navigate = useNavigate()
  const user = AuthService.getUser()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState<boolean>(false)
  const [formData, setFormData] = useState<FormData>({
    firstName: user?.firstName || "",
    lastName: user?.lastName || "",
    email: user?.email || "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  })
  
  const [errors, setErrors] = useState<FormErrors>({})
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)

  // Fetch user avatar on component mount
  useEffect(() => {
    const fetchAvatar = async () => {
      try {
        const avatarData = await AuthService.getUserAvatar();
        if (avatarData.hasAvatar && avatarData.avatarUrl) {
          setAvatarUrl(avatarData.avatarUrl);
        }
      } catch (error) {
        console.error("Failed to fetch avatar:", error);
      }
    };
    
    fetchAvatar();
  }, []);

  const handleGoBack = () => {
    navigate(-1)
  }

  const getInitials = (firstName: string, lastName: string): string => {
    return `${firstName[0]}${lastName[0]}`
  }

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    
    // Clear error when user starts typing
    if (errors[name as keyof FormErrors]) {
      setErrors({
        ...errors,
        [name]: undefined
      })
    }
  }

  const handleAvatarClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click()
    }
  }

  const handleAvatarChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return;
    
    // Create a preview URL for the selected image
    const previewUrl = URL.createObjectURL(file)
    setAvatarPreview(previewUrl)
    
    // Upload the avatar to the server
    setIsUploading(true);
    try {
      const result = await AuthService.uploadAvatar(file);
      setAvatarUrl(result.avatarUrl);
      
      toast({
        title: "Avatar Updated",
        description: "Your profile picture has been updated successfully.",
        duration: 3000,
      });
    } catch (error) {
      toast({
        title: "Upload Failed",
        description: error instanceof Error ? error.message : "Failed to upload avatar",
        variant: "destructive",
        duration: 3000,
      });
      
      // Revert to previous avatar or clear preview on failure
      setAvatarPreview(null);
    } finally {
      setIsUploading(false);
    }
  }
  
  const handleDeleteAvatar = async () => {
    if (!window.confirm("Are you sure you want to remove your profile picture?")) {
      return;
    }
    
    setIsUploading(true);
    try {
      await AuthService.deleteAvatar();
      setAvatarUrl(null);
      setAvatarPreview(null);
      
      toast({
        title: "Avatar Removed",
        description: "Your profile picture has been removed.",
        duration: 3000,
      });
    } catch (error) {
      toast({
        title: "Removal Failed",
        description: error instanceof Error ? error.message : "Failed to remove avatar",
        variant: "destructive",
        duration: 3000,
      });
    } finally {
      setIsUploading(false);
    }
  }

  const validateProfileForm = (): boolean => {
    const newErrors: FormErrors = {}
    
    if (!formData.firstName.trim()) {
      newErrors.firstName = "First name is required"
    }
    
    if (!formData.lastName.trim()) {
      newErrors.lastName = "Last name is required"
    }
    
    if (!formData.email.trim()) {
      newErrors.email = "Email is required"
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Email address is invalid"
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }
  
  const validatePasswordForm = (): boolean => {
    const newErrors: FormErrors = {}
    
    if (!formData.currentPassword) {
      newErrors.currentPassword = "Current password is required"
    }
    
    if (!formData.newPassword) {
      newErrors.newPassword = "New password is required"
    } else if (formData.newPassword.length < 8) {
      newErrors.newPassword = "Password must be at least 8 characters"
    }
    
    if (formData.newPassword !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match"
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleUpdateProfile = async (e: FormEvent) => {
    e.preventDefault()
    
    if (!validateProfileForm()) {
      return
    }
    
    setIsSubmitting(true)
    
    try {
      // Call API to update profile information
      await AuthService.updateUser(formData)
      
      // Update local user data
      if (user) {
        const updatedUser = {
          ...user,
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email
        }
        AuthService.setUser(updatedUser)
      }
      
      toast({
        title: "Profile Updated",
        description: "Your profile information has been updated successfully.",
        duration: 3000,
      })
    } catch (error) {
      toast({
        title: "Update Failed",
        description: error instanceof Error ? error.message : "There was a problem updating your profile.",
        variant: "destructive",
        duration: 3000,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleUpdatePassword = async (e: FormEvent) => {
    e.preventDefault()
    
    if (!validatePasswordForm()) {
      return
    }
    
    setIsSubmitting(true)
    
    try {
      // Call API to update password
      await AuthService.updatePassword(
        formData.currentPassword,
        formData.newPassword
      )
      
      // Clear password fields after successful update
      setFormData(prev => ({
        ...prev,
        currentPassword: "",
        newPassword: "",
        confirmPassword: ""
      }))
      
      toast({
        title: "Password Updated",
        description: "Your password has been updated successfully.",
        duration: 3000,
      })
    } catch (error) {
      toast({
        title: "Update Failed",
        description: error instanceof Error ? error.message : "There was a problem updating your password.",
        variant: "destructive",
        duration: 3000,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex-1">
      <div className="flex items-center px-4 h-16 border-b">
        <div className="flex items-center gap-4">
          <button 
            onClick={handleGoBack}
            className="flex items-center gap-2 text-gray-500 hover:text-gray-700 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm">Back</span>
          </button>
          <div className="h-6 w-px bg-gray-200" />
          <div className="flex items-center gap-2">
            <CircleUser className="mr-2" />
            <h1 className="text-2xl font-bold text-[#172B4D] dark:text-gray-300">Account Settings</h1>
          </div>
        </div>
      </div>
      
      <div className="container mx-auto py-8 px-4 md:px-6 lg:px-8">
        <div className="mb-6">
          <p className="text-muted-foreground">Manage your account information and preferences</p>
        </div>

        <div className="grid gap-6">
          {/* Profile Information */}
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>Update your personal information and email address</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpdateProfile} className="space-y-6">
                <div className="flex items-center space-x-4">
                  <div className="relative">
                    <Avatar className="h-20 w-20 cursor-pointer overflow-hidden" onClick={handleAvatarClick}>
                      {avatarPreview ? (
                        <AvatarImage 
                          src={avatarPreview} 
                          alt={user?.firstName}
                          className="object-cover w-full h-full"
                        />
                      ) : avatarUrl ? (
                        <AvatarImage 
                          src={avatarUrl} 
                          alt={user?.firstName}
                          className="object-cover w-full h-full"
                        />
                      ) : (
                        <>
                          <AvatarImage 
                            src="/placeholder-avatar.jpg" 
                            alt={user?.firstName}
                            className="object-cover w-full h-full"
                          />
                          <AvatarFallback className="text-lg">
                            {user ? getInitials(user.firstName, user.lastName) : <User />}
                          </AvatarFallback>
                        </>
                      )}
                    </Avatar>
                    <div 
                      className="absolute bottom-0 right-0 bg-primary text-white rounded-full p-1 cursor-pointer"
                      onClick={handleAvatarClick}
                    >
                      <Camera className="h-4 w-4" />
                    </div>
                  </div>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    accept="image/*" 
                    className="hidden" 
                    onChange={handleAvatarChange} 
                    disabled={isUploading}
                  />
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm"
                        onClick={handleAvatarClick}
                        disabled={isUploading}
                      >
                        {isUploading ? "Uploading..." : "Change Image"}
                      </Button>
                      {(avatarUrl || avatarPreview) && (
                        <Button 
                          type="button" 
                          variant="destructive" 
                          size="sm"
                          onClick={handleDeleteAvatar}
                          disabled={isUploading}
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Remove
                        </Button>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Upload a square image. Recommended size is 256x256px.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input
                      id="firstName"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleInputChange}
                      className={errors.firstName ? "border-red-500" : ""}
                    />
                    {errors.firstName && (
                      <p className="text-red-500 text-sm">{errors.firstName}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                      id="lastName"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleInputChange}
                      className={errors.lastName ? "border-red-500" : ""}
                    />
                    {errors.lastName && (
                      <p className="text-red-500 text-sm">{errors.lastName}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className={errors.email ? "border-red-500" : ""}
                  />
                  {errors.email && (
                    <p className="text-red-500 text-sm">{errors.email}</p>
                  )}
                </div>

                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Saving..." : "Save Changes"}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Password */}
          <Card>
            <CardHeader>
              <CardTitle>Password</CardTitle>
              <CardDescription>Change your password</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpdatePassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="currentPassword">Current Password</Label>
                  <Input
                    id="currentPassword"
                    name="currentPassword"
                    type="password"
                    value={formData.currentPassword}
                    onChange={handleInputChange}
                    className={errors.currentPassword ? "border-red-500" : ""}
                  />
                  {errors.currentPassword && (
                    <p className="text-red-500 text-sm">{errors.currentPassword}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <Input
                    id="newPassword"
                    name="newPassword"
                    type="password"
                    value={formData.newPassword}
                    onChange={handleInputChange}
                    className={errors.newPassword ? "border-red-500" : ""}
                  />
                  {errors.newPassword && (
                    <p className="text-red-500 text-sm">{errors.newPassword}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    className={errors.confirmPassword ? "border-red-500" : ""}
                  />
                  {errors.confirmPassword && (
                    <p className="text-red-500 text-sm">{errors.confirmPassword}</p>
                  )}
                </div>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Updating..." : "Update Password"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}