import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Phone, Mail, MapPin, Edit, User, Building, Calendar, Hash } from "lucide-react";
import { EmployeeProfile } from "@/hooks/useEmployeeDetail";
import { format } from "date-fns";

interface PersonalInfoTabProps {
  employee: EmployeeProfile;
}

export const PersonalInfoTab = ({ employee }: PersonalInfoTabProps) => {
  const fullName = [employee.first_name, employee.last_name].filter(Boolean).join(" ") 
    || employee.display_name 
    || "—";

  const fullAddress = [
    employee.address_street,
    employee.address_city,
    employee.address_state,
    employee.address_zip,
    employee.address_country,
  ].filter(Boolean).join(", ");

  const googleMapsUrl = fullAddress 
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress)}`
    : null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Personal Information */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <User className="h-5 w-5 text-muted-foreground" />
            Personal Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-muted-foreground">First Name</label>
              <p className="font-medium text-foreground">{employee.first_name || "—"}</p>
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Last Name</label>
              <p className="font-medium text-foreground">{employee.last_name || "—"}</p>
            </div>
          </div>
          <div>
            <label className="text-sm text-muted-foreground">Display Name</label>
            <p className="font-medium text-foreground">{employee.display_name || "—"}</p>
          </div>
          <div>
            <label className="text-sm text-muted-foreground">Status</label>
            <p className="font-medium text-foreground capitalize">{employee.status}</p>
          </div>
        </CardContent>
      </Card>

      {/* Contact Information */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Phone className="h-5 w-5 text-muted-foreground" />
            Contact Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm text-muted-foreground">Phone</label>
            <div className="flex items-center gap-2">
              {employee.phone ? (
                <a 
                  href={`tel:${employee.phone}`} 
                  className="font-medium text-primary hover:underline"
                >
                  {employee.phone}
                </a>
              ) : (
                <p className="font-medium text-muted-foreground">—</p>
              )}
            </div>
          </div>
          <div>
            <label className="text-sm text-muted-foreground">Email</label>
            <div className="flex items-center gap-2">
              {employee.email ? (
                <a 
                  href={`mailto:${employee.email}`} 
                  className="font-medium text-primary hover:underline"
                >
                  {employee.email}
                </a>
              ) : (
                <p className="font-medium text-muted-foreground">—</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Address Information */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <MapPin className="h-5 w-5 text-muted-foreground" />
            Address
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm text-muted-foreground">Street Address</label>
            <p className="font-medium text-foreground">{employee.address_street || "—"}</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-muted-foreground">City</label>
              <p className="font-medium text-foreground">{employee.address_city || "—"}</p>
            </div>
            <div>
              <label className="text-sm text-muted-foreground">State/Province</label>
              <p className="font-medium text-foreground">{employee.address_state || "—"}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-muted-foreground">ZIP/Postal Code</label>
              <p className="font-medium text-foreground">{employee.address_zip || "—"}</p>
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Country</label>
              <p className="font-medium text-foreground">{employee.address_country || "—"}</p>
            </div>
          </div>
          {googleMapsUrl && (
            <Button variant="outline" size="sm" asChild>
              <a href={googleMapsUrl} target="_blank" rel="noopener noreferrer">
                <MapPin className="h-4 w-4 mr-2" />
                View on Map
              </a>
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Employment Overview */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Building className="h-5 w-5 text-muted-foreground" />
            Employment Overview
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-muted-foreground">Employee ID</label>
              <p className="font-medium text-foreground">{employee.employee_id || "—"}</p>
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Trade Number</label>
              <p className="font-medium text-foreground">{employee.trade_number || "—"}</p>
            </div>
          </div>
          <div>
            <label className="text-sm text-muted-foreground">Department</label>
            <p className="font-medium text-foreground">{employee.department_name || "—"}</p>
          </div>
          <div>
            <label className="text-sm text-muted-foreground">Role</label>
            <p className="font-medium text-foreground capitalize">{employee.role || "Employee"}</p>
          </div>
          <div>
            <label className="text-sm text-muted-foreground">Date of Hire</label>
            <p className="font-medium text-foreground">
              {employee.date_of_hire 
                ? format(new Date(employee.date_of_hire), "MMMM d, yyyy")
                : "—"
              }
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
