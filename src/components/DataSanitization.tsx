import React, { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { HelpCircle, Settings } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { ChevronDown } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

export interface SanitizationOptions {
  removeSpecialChars: boolean;
  replaceWithSpace?: boolean;
  sanitizeZipCodes: boolean;
  keepExtendedZip?: boolean;
  formatPolicyNumbers?: boolean;
  autoDetectPolicyFormat?: boolean;
  formatSSNs?: boolean;
  ssnFormat?: "XXX-XX-XXXX" | "XXXXXXXXX" | "XXX-XX-****";
  removeHtmlFormatting?: boolean;
  preserveLineBreaks?: boolean;
  formatDates?: boolean;
  dateFormat?: string;
  countryFormat?: "US" | "CA" | "UK" | "other";
}

interface DataSanitizationProps {
  options: SanitizationOptions;
  onOptionsChange: (options: SanitizationOptions) => void;
}

export function DataSanitization({
  options,
  onOptionsChange,
}: DataSanitizationProps) {
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const handleOptionChange = (
    key: keyof SanitizationOptions,
    value: boolean | string,
  ) => {
    onOptionsChange({
      ...options,
      [key]: value,
    });
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-lg">Data Sanitization</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Label htmlFor="special-chars">Remove Special Characters</Label>
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="text-muted-foreground size-4" />
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>
                  Removes special characters from text fields,
                  <br />
                  replacing them with spaces.
                  <br />
                  Email addresses and currency values are preserved.
                </p>
              </TooltipContent>
            </Tooltip>
          </div>
          <Switch
            id="special-chars"
            checked={options.removeSpecialChars}
            onCheckedChange={(checked) =>
              handleOptionChange("removeSpecialChars", checked)
            }
          />
        </div>

        {options.removeSpecialChars && (
          <div className="ml-6 flex items-center justify-between">
            <Label htmlFor="replace-with-space">Replace with spaces</Label>
            <Switch
              id="replace-with-space"
              checked={options.replaceWithSpace || false}
              onCheckedChange={(checked) =>
                handleOptionChange("replaceWithSpace", checked)
              }
            />
          </div>
        )}

        <Separator />

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Label htmlFor="zip-codes">Format ZIP Codes</Label>
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="text-muted-foreground size-4" />
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>
                  Removes hyphens and the last 4 digits from ZIP+4 codes
                  <br />
                  (e.g., 12345-6789 becomes 12345)
                  <br />
                  Applies to all columns including those set to ZIP code type
                </p>
              </TooltipContent>
            </Tooltip>
          </div>
          <Switch
            id="zip-codes"
            checked={options.sanitizeZipCodes}
            onCheckedChange={(checked) =>
              handleOptionChange("sanitizeZipCodes", checked)
            }
          />
        </div>

        {options.sanitizeZipCodes && (
          <>
            <div className="ml-6 flex items-center justify-between">
              <Label htmlFor="country-format">Country Format</Label>
              <Select
                value={options.countryFormat || "US"}
                onValueChange={(value: string) =>
                  handleOptionChange(
                    "countryFormat",
                    value as "US" | "CA" | "UK" | "other",
                  )
                }
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Select country" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="US">United States</SelectItem>
                  <SelectItem value="CA">Canada</SelectItem>
                  <SelectItem value="UK">United Kingdom</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="ml-6 flex items-center justify-between">
              <Label htmlFor="keep-extended-zip">
                Keep extended format (ZIP+4)
              </Label>
              <Switch
                id="keep-extended-zip"
                checked={options.keepExtendedZip || false}
                onCheckedChange={(checked) =>
                  handleOptionChange("keepExtendedZip", checked)
                }
              />
            </div>
          </>
        )}

        <Separator />

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Label htmlFor="policy-numbers">Format Policy Numbers</Label>
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="text-muted-foreground size-4" />
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>Standardize insurance policy number formats</p>
              </TooltipContent>
            </Tooltip>
          </div>
          <Switch
            id="policy-numbers"
            checked={options.formatPolicyNumbers || false}
            onCheckedChange={(checked) =>
              handleOptionChange("formatPolicyNumbers", checked)
            }
          />
        </div>

        {options.formatPolicyNumbers && (
          <div className="ml-6 flex items-center justify-between">
            <Label htmlFor="autodetect-policy">
              Auto-detect common formats
            </Label>
            <Switch
              id="autodetect-policy"
              checked={options.autoDetectPolicyFormat || true}
              onCheckedChange={(checked) =>
                handleOptionChange("autoDetectPolicyFormat", checked)
              }
            />
          </div>
        )}

        <Separator />

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Label htmlFor="ssn-format">Format SSNs</Label>
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="text-muted-foreground size-4" />
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>Format Social Security Numbers consistently</p>
              </TooltipContent>
            </Tooltip>
          </div>
          <Switch
            id="ssn-format"
            checked={options.formatSSNs || false}
            onCheckedChange={(checked) =>
              handleOptionChange("formatSSNs", checked)
            }
          />
        </div>

        {options.formatSSNs && (
          <div className="ml-6 flex items-center justify-between">
            <Label htmlFor="ssn-format-type">Format type</Label>
            <Select
              value={options.ssnFormat || "XXX-XX-XXXX"}
              onValueChange={(value: string) =>
                handleOptionChange(
                  "ssnFormat",
                  value as "XXX-XX-XXXX" | "XXXXXXXXX" | "XXX-XX-****",
                )
              }
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Select format" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="XXX-XX-XXXX">XXX-XX-XXXX</SelectItem>
                <SelectItem value="XXXXXXXXX">XXXXXXXXX</SelectItem>
                <SelectItem value="XXX-XX-****">
                  XXX-XX-**** (masked)
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        <Separator />

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Label htmlFor="html-formatting">Remove HTML Formatting</Label>
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="text-muted-foreground size-4" />
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>Clean text from HTML tags and entities</p>
              </TooltipContent>
            </Tooltip>
          </div>
          <Switch
            id="html-formatting"
            checked={options.removeHtmlFormatting || false}
            onCheckedChange={(checked) =>
              handleOptionChange("removeHtmlFormatting", checked)
            }
          />
        </div>

        {options.removeHtmlFormatting && (
          <div className="ml-6 flex items-center justify-between">
            <Label htmlFor="preserve-linebreaks">Preserve line breaks</Label>
            <Switch
              id="preserve-linebreaks"
              checked={
                options.preserveLineBreaks === undefined
                  ? true
                  : options.preserveLineBreaks
              }
              onCheckedChange={(checked) =>
                handleOptionChange("preserveLineBreaks", checked)
              }
            />
          </div>
        )}

        <Separator />

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Label htmlFor="dates">Standardize Dates</Label>
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="text-muted-foreground size-4" />
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>Convert dates to a consistent format</p>
              </TooltipContent>
            </Tooltip>
          </div>
          <Switch
            id="dates"
            checked={options.formatDates || false}
            onCheckedChange={(checked) =>
              handleOptionChange("formatDates", checked)
            }
          />
        </div>

        {options.formatDates && (
          <div className="ml-6 flex items-center justify-between">
            <Label htmlFor="date-format">Date format</Label>
            <Select
              value={options.dateFormat || "MM/DD/YYYY"}
              onValueChange={(value: string) =>
                handleOptionChange("dateFormat", value)
              }
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Select format" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                <SelectItem value="MM-DD-YYYY">MM-DD-YYYY</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Advanced Options Section */}
        <Collapsible
          open={advancedOpen}
          onOpenChange={setAdvancedOpen}
          className="mt-2 space-y-2"
        >
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="flex w-full justify-between"
            >
              <span>Advanced Options</span>
              <ChevronDown className="size-4" />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-2">
            <div className="rounded-md border p-4">
              <div className="text-sm">
                Additional options will be available in future updates:
              </div>
              <ul className="text-muted-foreground mt-2 ml-4 list-disc text-sm">
                <li>Phone number formatting</li>
                <li>Currency standardization</li>
                <li>Address normalization</li>
                <li>State code standardization (CA vs California)</li>
              </ul>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>

      <CardFooter className="px-6 pb-4">
        <Alert variant="outline" className="bg-muted/50">
          <div className="flex items-center gap-2">
            <Settings className="text-muted-foreground h-4 w-4" />
            <AlertDescription className="text-muted-foreground text-xs">
              For column-specific settings, click the settings icon{" "}
              <Settings className="inline h-3 w-3" /> above each column header
              in the data table.
            </AlertDescription>
          </div>
        </Alert>
      </CardFooter>
    </Card>
  );
}
