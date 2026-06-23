"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Upload, FileText, CheckCircle2 } from "lucide-react";
import { submitParkMonitorApplication } from "@/app/actions/park-monitor";
import { uploadGenericDocument } from "@/app/actions/upload";

export function ApplyForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [biodata, setBiodata] = useState({
    surname: "", firstName: "", otherNames: "", gender: "", age: "",
    stateOfOrigin: "", lga: "", communityTown: "", nin: "",
    residentialAddress: "", phoneNumber: "", emailAddress: "", maritalStatus: ""
  });

  const [employment, setEmployment] = useState({
    currentOccupation: "", employer: "", positionHeld: ""
  });

  const [health, setHealth] = useState({
    height: "", weight: "", isMedicallyFit: "yes"
  });

  const [character, setCharacter] = useState({
    hasCriminalConviction: "no", agreesToSecurityCheck: "yes"
  });

  const [suitability, setSuitability] = useState({
    reasonForJoining: ""
  });

  const [referees, setReferees] = useState([
    { name: "", phone: "", relation: "", email: "", address: "" },
    { name: "", phone: "", relation: "", email: "", address: "" },
    { name: "", phone: "", relation: "", email: "", address: "" }
  ]);

  const [nextOfKin, setNextOfKin] = useState({
    nextOfKinName: "", nextOfKinPhone: "", nextOfKinRelationship: "", nextOfKinAddress: ""
  });

  const [declarationChecked, setDeclarationChecked] = useState(false);

  // File upload states
  const [credentialFile, setCredentialFile] = useState<File | null>(null);
  const [credentialDocId, setCredentialDocId] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  const [isSuccess, setIsSuccess] = useState(false);

  const handleUpload = async (file: File) => {
    setIsUploading(true);
    setError(null);
    try {
      const result = await uploadGenericDocument(file, "credentials", "PARK_MONITOR_APP");
      if (result.success) {
        setCredentialDocId(result.documentId);
      } else {
        setError(result.error);
      }
    } catch (e) {
      setError("Failed to upload credential");
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!declarationChecked) {
      setError("You must agree to the declaration to submit.");
      return;
    }

    startTransition(async () => {
      const data = {
        ...biodata,
        age: parseInt(biodata.age) || 0,
        ...employment,
        ...health,
        isMedicallyFit: health.isMedicallyFit === "yes",
        ...character,
        hasCriminalConviction: character.hasCriminalConviction === "yes",
        agreesToSecurityCheck: character.agreesToSecurityCheck === "yes",
        ...suitability,
        referees: referees,
        ...nextOfKin,
      };

      const res = await submitParkMonitorApplication(data);
      if (res.success) {
        setIsSuccess(true);
      } else {
        setError(res.error);
      }
    });
  };

  const updateReferee = (index: number, field: string, value: string) => {
    const newRefs = [...referees];
    newRefs[index] = { ...newRefs[index], [field]: value };
    setReferees(newRefs);
  };

  if (isSuccess) {
    return (
      <div className="bg-green-50 border border-green-200 p-8 rounded-lg text-center space-y-4">
        <CheckCircle2 className="w-16 h-16 text-green-600 mx-auto" />
        <h2 className="text-2xl font-bold text-green-800">Application Submitted!</h2>
        <p className="text-green-700">
          Your application for the Park Monitor position has been successfully submitted.
          We will review it and notify you via email regarding the outcome.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8 max-w-4xl mx-auto pb-20">
      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-md text-sm border border-red-200">
          {error}
        </div>
      )}

      {/* SECTION A: BIODATA */}
      <Card>
        <CardHeader>
          <CardTitle>Section A: Biodata</CardTitle>
          <CardDescription>Enter your personal details.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label>Surname</Label>
            <Input required value={biodata.surname} onChange={e => setBiodata({...biodata, surname: e.target.value})} />
          </div>
          <div className="space-y-1">
            <Label>First Name</Label>
            <Input required value={biodata.firstName} onChange={e => setBiodata({...biodata, firstName: e.target.value})} />
          </div>
          <div className="space-y-1">
            <Label>Other Names</Label>
            <Input value={biodata.otherNames} onChange={e => setBiodata({...biodata, otherNames: e.target.value})} />
          </div>
          <div className="space-y-1">
            <Label>Gender</Label>
            <Select onValueChange={v => setBiodata({...biodata, gender: v})} value={biodata.gender}>
              <SelectTrigger><SelectValue placeholder="Select Gender" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="MALE">Male</SelectItem>
                <SelectItem value="FEMALE">Female</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Age</Label>
            <Input type="number" required value={biodata.age} onChange={e => setBiodata({...biodata, age: e.target.value})} />
          </div>
          <div className="space-y-1">
            <Label>State of Origin</Label>
            <Input required value={biodata.stateOfOrigin} onChange={e => setBiodata({...biodata, stateOfOrigin: e.target.value})} />
          </div>
          <div className="space-y-1">
            <Label>LGA</Label>
            <Input required value={biodata.lga} onChange={e => setBiodata({...biodata, lga: e.target.value})} />
          </div>
          <div className="space-y-1">
            <Label>Community/Town</Label>
            <Input required value={biodata.communityTown} onChange={e => setBiodata({...biodata, communityTown: e.target.value})} />
          </div>
          <div className="space-y-1">
            <Label>NIN</Label>
            <Input required value={biodata.nin} onChange={e => setBiodata({...biodata, nin: e.target.value})} />
          </div>
          <div className="space-y-1">
            <Label>Phone Number</Label>
            <Input required value={biodata.phoneNumber} onChange={e => setBiodata({...biodata, phoneNumber: e.target.value})} />
          </div>
          <div className="space-y-1">
            <Label>Email Address</Label>
            <Input type="email" required value={biodata.emailAddress} onChange={e => setBiodata({...biodata, emailAddress: e.target.value})} />
          </div>
          <div className="space-y-1">
            <Label>Marital Status</Label>
            <Select onValueChange={v => setBiodata({...biodata, maritalStatus: v})} value={biodata.maritalStatus}>
              <SelectTrigger><SelectValue placeholder="Select Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="SINGLE">Single</SelectItem>
                <SelectItem value="MARRIED">Married</SelectItem>
                <SelectItem value="DIVORCED">Divorced</SelectItem>
                <SelectItem value="WIDOWED">Widowed</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-full space-y-1">
            <Label>Residential Address</Label>
            <Textarea required value={biodata.residentialAddress} onChange={e => setBiodata({...biodata, residentialAddress: e.target.value})} />
          </div>
        </CardContent>
      </Card>

      {/* SECTION B: EDUCATIONAL QUALIFICATIONS */}
      <Card>
        <CardHeader>
          <CardTitle>Section B: Educational Qualifications</CardTitle>
          <CardDescription>Attach photocopies of all credentials as a single PDF.</CardDescription>
        </CardHeader>
        <CardContent>
          {!credentialDocId ? (
            <div className="border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center text-center">
              <input
                type="file"
                id="credentialFile"
                className="hidden"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setCredentialFile(file);
                    handleUpload(file);
                  }
                }}
              />
              <label
                htmlFor="credentialFile"
                className="cursor-pointer flex flex-col items-center gap-2 text-slate-500 hover:text-slate-900"
              >
                <Upload className="w-8 h-8" />
                <span className="font-medium">
                  {isUploading ? "Uploading..." : "Click to upload credentials"}
                </span>
                <span className="text-xs">PDF, JPG, PNG (Max 5MB)</span>
              </label>
            </div>
          ) : (
            <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
              <CheckCircle2 className="w-5 h-5" />
              <div className="flex-1">
                <p className="font-medium text-sm">Credentials Uploaded</p>
                <p className="text-xs opacity-80">{credentialFile?.name}</p>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={() => setCredentialDocId("")}>
                Replace
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* SECTION C: EMPLOYMENT HISTORY */}
      <Card>
        <CardHeader>
          <CardTitle>Section C: Employment History</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label>Current Occupation</Label>
            <Input value={employment.currentOccupation} onChange={e => setEmployment({...employment, currentOccupation: e.target.value})} />
          </div>
          <div className="space-y-1">
            <Label>Employer</Label>
            <Input value={employment.employer} onChange={e => setEmployment({...employment, employer: e.target.value})} />
          </div>
          <div className="space-y-1">
            <Label>Position Held</Label>
            <Input value={employment.positionHeld} onChange={e => setEmployment({...employment, positionHeld: e.target.value})} />
          </div>
        </CardContent>
      </Card>

      {/* SECTION D: HEALTH AND PHYSICAL FITNESS */}
      <Card>
        <CardHeader>
          <CardTitle>Section D: Health & Physical Fitness</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label>Height</Label>
            <Input placeholder="e.g. 180cm" value={health.height} onChange={e => setHealth({...health, height: e.target.value})} />
          </div>
          <div className="space-y-1">
            <Label>Weight</Label>
            <Input placeholder="e.g. 75kg" value={health.weight} onChange={e => setHealth({...health, weight: e.target.value})} />
          </div>
          <div className="col-span-full space-y-1">
            <Label>Are you medically fit for enforcement duties?</Label>
            <Select onValueChange={v => setHealth({...health, isMedicallyFit: v})} value={health.isMedicallyFit}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="yes">Yes</SelectItem>
                <SelectItem value="no">No</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* SECTION E: CHARACTER AND SECURITY */}
      <Card>
        <CardHeader>
          <CardTitle>Section E: Character & Security Screening</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label>Have you ever been convicted of any criminal offense?</Label>
            <Select onValueChange={v => setCharacter({...character, hasCriminalConviction: v})} value={character.hasCriminalConviction}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="yes">Yes</SelectItem>
                <SelectItem value="no">No</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Are you willing to undergo security background checks?</Label>
            <Select onValueChange={v => setCharacter({...character, agreesToSecurityCheck: v})} value={character.agreesToSecurityCheck}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="yes">Yes</SelectItem>
                <SelectItem value="no">No</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* SECTION F: ENFORCEMENT SUITABILITY */}
      <Card>
        <CardHeader>
          <CardTitle>Section F: Enforcement Suitability Assessment</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            <Label>Why do you want to join the Special Enforcement Unit?</Label>
            <Textarea required value={suitability.reasonForJoining} onChange={e => setSuitability({...suitability, reasonForJoining: e.target.value})} rows={4} />
          </div>
        </CardContent>
      </Card>

      {/* SECTION G: REFERENCES */}
      <Card>
        <CardHeader>
          <CardTitle>Section G: References</CardTitle>
          <CardDescription>Provide 3 referees.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {referees.map((referee, index) => (
            <div key={index} className="grid grid-cols-1 sm:grid-cols-2 gap-4 border p-4 rounded-md">
              <div className="font-semibold col-span-full">Referee {index + 1}</div>
              <div className="space-y-1">
                <Label>Name</Label>
                <Input required value={referee.name} onChange={e => updateReferee(index, 'name', e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Phone</Label>
                <Input required value={referee.phone} onChange={e => updateReferee(index, 'phone', e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Email</Label>
                <Input type="email" value={referee.email} onChange={e => updateReferee(index, 'email', e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Relationship</Label>
                <Input value={referee.relation} onChange={e => updateReferee(index, 'relation', e.target.value)} />
              </div>
              <div className="col-span-full space-y-1">
                <Label>Address</Label>
                <Input value={referee.address} onChange={e => updateReferee(index, 'address', e.target.value)} />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* SECTION H: NEXT OF KIN */}
      <Card>
        <CardHeader>
          <CardTitle>Section H: Next of Kin</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label>Name</Label>
            <Input required value={nextOfKin.nextOfKinName} onChange={e => setNextOfKin({...nextOfKin, nextOfKinName: e.target.value})} />
          </div>
          <div className="space-y-1">
            <Label>Phone</Label>
            <Input required value={nextOfKin.nextOfKinPhone} onChange={e => setNextOfKin({...nextOfKin, nextOfKinPhone: e.target.value})} />
          </div>
          <div className="space-y-1">
            <Label>Relationship</Label>
            <Input required value={nextOfKin.nextOfKinRelationship} onChange={e => setNextOfKin({...nextOfKin, nextOfKinRelationship: e.target.value})} />
          </div>
          <div className="col-span-full space-y-1">
            <Label>Address</Label>
            <Textarea required value={nextOfKin.nextOfKinAddress} onChange={e => setNextOfKin({...nextOfKin, nextOfKinAddress: e.target.value})} />
          </div>
        </CardContent>
      </Card>

      {/* DECLARATION */}
      <div className="flex items-start space-x-3 p-4 bg-muted/50 rounded-lg">
        <Checkbox 
          id="declaration" 
          checked={declarationChecked} 
          onCheckedChange={(c) => setDeclarationChecked(c as boolean)} 
        />
        <div className="space-y-1 leading-none">
          <Label htmlFor="declaration" className="font-semibold cursor-pointer">Applicant&apos;s Declaration</Label>
          <p className="text-sm text-muted-foreground mt-1">
            I hereby certify that all information provided is true and correct.
          </p>
        </div>
      </div>

      <Button type="submit" disabled={isPending || isUploading} className="w-full h-12 text-base font-semibold">
        {isPending ? (
          <>
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            Submitting Application...
          </>
        ) : (
          "Submit Application"
        )}
      </Button>
    </form>
  );
}
