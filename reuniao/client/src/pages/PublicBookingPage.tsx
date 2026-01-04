import { useState, useMemo, useEffect } from "react";
import { useParams } from "wouter";
import { useForm } from "react-hook-form";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  Clock, 
  Calendar as CalendarIcon, 
  ArrowLeft, 
  Check, 
  Loader2,
  ExternalLink,
  Download,
  MapPin
} from "lucide-react";

import { usePublicBooking } from "@/hooks/usePublicBooking";
import { BookingField, DesignConfig } from "@/types/reuniao";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type BookingStep = "welcome" | "date" | "time" | "form" | "confirmation";

export default function PublicBookingPage() {
  const { companySlug, meetingSlug } = useParams<{ companySlug: string; meetingSlug: string }>();
  const [step, setStep] = useState<BookingStep>("welcome");

  const {
    meeting,
    tenant,
    availableDates,
    selectedDate,
    selectedTime,
    availableSlots,
    selectDate,
    selectTime,
    submitBooking,
    isLoading,
    isSlotsLoading,
    isSubmitting,
    error,
    bookingResult,
    isBookingSuccess,
  } = usePublicBooking({ company: companySlug || "", slug: meetingSlug || "" });

  const designConfig = meeting?.designConfig;

  const cssVariables = useMemo(() => {
    if (!designConfig) return {};
    return {
      "--booking-primary": designConfig.colors.primary,
      "--booking-secondary": designConfig.colors.secondary,
      "--booking-background": designConfig.colors.background,
      "--booking-text": designConfig.colors.text,
      "--booking-button": designConfig.colors.button || designConfig.colors.primary,
      "--booking-button-text": designConfig.colors.buttonText || "#ffffff",
    } as React.CSSProperties;
  }, [designConfig]);

  useEffect(() => {
    if (isBookingSuccess) {
      setStep("confirmation");
    }
  }, [isBookingSuccess]);

  const availableDatesSet = useMemo(() => {
    return new Set(availableDates.map((d) => d.date));
  }, [availableDates]);

  const isDateAvailable = (date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    return availableDatesSet.has(dateStr);
  };

  if (isLoading) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: "var(--booking-background, #f8fafc)" }}
      >
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !meeting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="pt-6 text-center">
            <div className="text-red-500 text-xl mb-4">⚠️</div>
            <h2 className="text-lg font-semibold mb-2">Reunião não encontrada</h2>
            <p className="text-muted-foreground">
              Verifique se o link está correto ou entre em contato com o organizador.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen py-8 px-4"
      style={{
        ...cssVariables,
        backgroundColor: "var(--booking-background, #f8fafc)",
        color: "var(--booking-text, #1e293b)",
      }}
    >
      <div className="max-w-2xl mx-auto">
        {step === "welcome" && (
          <WelcomeScreen
            meeting={meeting}
            tenant={tenant}
            designConfig={designConfig}
            onStart={() => setStep("date")}
          />
        )}

        {step === "date" && (
          <DateSelectionStep
            meeting={meeting}
            tenant={tenant}
            designConfig={designConfig}
            selectedDate={selectedDate}
            isDateAvailable={isDateAvailable}
            onSelectDate={(date) => {
              selectDate(format(date, "yyyy-MM-dd"));
              setStep("time");
            }}
            onBack={() => setStep("welcome")}
          />
        )}

        {step === "time" && (
          <TimeSelectionStep
            meeting={meeting}
            tenant={tenant}
            designConfig={designConfig}
            selectedDate={selectedDate!}
            availableSlots={availableSlots}
            isSlotsLoading={isSlotsLoading}
            onSelectTime={(time) => {
              selectTime(time);
              setStep("form");
            }}
            onBack={() => setStep("date")}
          />
        )}

        {step === "form" && (
          <BookingFormStep
            meeting={meeting}
            tenant={tenant}
            designConfig={designConfig}
            selectedDate={selectedDate!}
            selectedTime={selectedTime!}
            bookingFields={meeting.bookingFields || []}
            isSubmitting={isSubmitting}
            onSubmit={async (answers) => {
              await submitBooking(answers);
            }}
            onBack={() => setStep("time")}
          />
        )}

        {step === "confirmation" && bookingResult && (
          <ConfirmationStep
            meeting={meeting}
            tenant={tenant}
            designConfig={designConfig}
            bookingResult={bookingResult}
          />
        )}
      </div>
    </div>
  );
}

interface StepProps {
  meeting: NonNullable<ReturnType<typeof usePublicBooking>["meeting"]>;
  tenant: ReturnType<typeof usePublicBooking>["tenant"];
  designConfig?: DesignConfig;
}

function LogoAndHeader({ tenant, designConfig }: Pick<StepProps, "tenant" | "designConfig">) {
  const logoUrl = designConfig?.logo || tenant?.logoUrl;
  const logoAlignment = designConfig?.logoAlignment || "center";

  return (
    <div className={`mb-6 flex ${logoAlignment === "left" ? "justify-start" : logoAlignment === "right" ? "justify-end" : "justify-center"}`}>
      {logoUrl ? (
        <img
          src={logoUrl}
          alt={tenant?.nome || "Logo"}
          className="h-12 object-contain"
          style={{ maxHeight: designConfig?.logoSize ? `${designConfig.logoSize}px` : "48px" }}
        />
      ) : tenant?.nome ? (
        <div className="text-xl font-bold" style={{ color: "var(--booking-primary)" }}>
          {tenant.nome}
        </div>
      ) : null}
    </div>
  );
}

function WelcomeScreen({
  meeting,
  tenant,
  designConfig,
  onStart,
}: StepProps & { onStart: () => void }) {
  return (
    <Card className="shadow-lg border-0">
      <CardHeader className="text-center pb-2">
        <LogoAndHeader tenant={tenant} designConfig={designConfig} />
        <CardTitle className="text-2xl font-bold">{meeting.welcomeTitle || meeting.title}</CardTitle>
        {meeting.welcomeMessage && (
          <CardDescription className="text-base mt-2">{meeting.welcomeMessage}</CardDescription>
        )}
        {!meeting.welcomeMessage && meeting.description && (
          <CardDescription className="text-base mt-2">{meeting.description}</CardDescription>
        )}
      </CardHeader>
      <CardContent className="pt-4">
        <div className="flex justify-center gap-4 mb-6">
          <Badge variant="secondary" className="flex items-center gap-1 px-3 py-1">
            <Clock className="h-4 w-4" />
            {meeting.duration} minutos
          </Badge>
          {meeting.locationType && (
            <Badge variant="outline" className="flex items-center gap-1 px-3 py-1">
              <MapPin className="h-4 w-4" />
              {meeting.locationType === "100ms" || meeting.locationType === "google_meet" || meeting.locationType === "zoom"
                ? "Videoconferência"
                : meeting.locationType === "in_person"
                ? "Presencial"
                : "Online"}
            </Badge>
          )}
        </div>

        <Button
          className="w-full py-6 text-lg font-semibold"
          style={{
            backgroundColor: "var(--booking-button, var(--booking-primary))",
            color: "var(--booking-button-text, #ffffff)",
          }}
          onClick={onStart}
        >
          Agendar Reunião
        </Button>
      </CardContent>
    </Card>
  );
}

function DateSelectionStep({
  meeting,
  tenant,
  designConfig,
  selectedDate,
  isDateAvailable,
  onSelectDate,
  onBack,
}: StepProps & {
  selectedDate: string | null;
  isDateAvailable: (date: Date) => boolean;
  onSelectDate: (date: Date) => void;
  onBack: () => void;
}) {
  return (
    <Card className="shadow-lg border-0">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2 mb-4">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <CardTitle className="text-xl">{meeting.title}</CardTitle>
            <CardDescription className="flex items-center gap-1 mt-1">
              <Clock className="h-4 w-4" />
              {meeting.duration} minutos
            </CardDescription>
          </div>
        </div>
        <LogoAndHeader tenant={tenant} designConfig={designConfig} />
        <p className="text-center text-muted-foreground">Selecione uma data disponível</p>
      </CardHeader>
      <CardContent className="flex justify-center">
        <Calendar
          mode="single"
          selected={selectedDate ? parseISO(selectedDate) : undefined}
          onSelect={(date) => date && onSelectDate(date)}
          disabled={(date) => {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            return date < today || !isDateAvailable(date);
          }}
          className="rounded-md"
        />
      </CardContent>
    </Card>
  );
}

function TimeSelectionStep({
  meeting,
  tenant,
  designConfig,
  selectedDate,
  availableSlots,
  isSlotsLoading,
  onSelectTime,
  onBack,
}: StepProps & {
  selectedDate: string;
  availableSlots: { time: string; available: boolean }[];
  isSlotsLoading: boolean;
  onSelectTime: (time: string) => void;
  onBack: () => void;
}) {
  const formattedDate = format(parseISO(selectedDate), "EEEE, d 'de' MMMM", { locale: ptBR });
  const availableTimesOnly = availableSlots.filter((slot) => slot.available);

  return (
    <Card className="shadow-lg border-0">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2 mb-4">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <CardTitle className="text-xl">{meeting.title}</CardTitle>
            <CardDescription className="flex items-center gap-1 mt-1">
              <CalendarIcon className="h-4 w-4" />
              <span className="capitalize">{formattedDate}</span>
            </CardDescription>
          </div>
        </div>
        <LogoAndHeader tenant={tenant} designConfig={designConfig} />
        <p className="text-center text-muted-foreground">Selecione um horário disponível</p>
      </CardHeader>
      <CardContent>
        {isSlotsLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : availableTimesOnly.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>Nenhum horário disponível nesta data.</p>
            <Button variant="outline" onClick={onBack} className="mt-4">
              Escolher outra data
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {availableTimesOnly.map((slot) => (
              <Button
                key={slot.time}
                variant="outline"
                className="font-medium hover:border-primary"
                style={{
                  borderColor: "var(--booking-primary)",
                }}
                onClick={() => onSelectTime(slot.time)}
              >
                {slot.time}
              </Button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function BookingFormStep({
  meeting,
  tenant,
  designConfig,
  selectedDate,
  selectedTime,
  bookingFields,
  isSubmitting,
  onSubmit,
  onBack,
}: StepProps & {
  selectedDate: string;
  selectedTime: string;
  bookingFields: BookingField[];
  isSubmitting: boolean;
  onSubmit: (answers: Record<string, any>) => Promise<void>;
  onBack: () => void;
}) {
  const formattedDate = format(parseISO(selectedDate), "EEEE, d 'de' MMMM", { locale: ptBR });
  
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm();

  const onFormSubmit = handleSubmit(async (data) => {
    await onSubmit(data);
  });

  const renderField = (field: BookingField) => {
    const errorMessage = errors[field.id]?.message as string | undefined;

    switch (field.type) {
      case "short_text":
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={field.id}>
              {field.title}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            {field.description && (
              <p className="text-sm text-muted-foreground">{field.description}</p>
            )}
            <Input
              id={field.id}
              placeholder={field.placeholder}
              {...register(field.id, {
                required: field.required ? "Este campo é obrigatório" : false,
                minLength: field.validation?.minLength
                  ? { value: field.validation.minLength, message: `Mínimo ${field.validation.minLength} caracteres` }
                  : undefined,
                maxLength: field.validation?.maxLength
                  ? { value: field.validation.maxLength, message: `Máximo ${field.validation.maxLength} caracteres` }
                  : undefined,
              })}
            />
            {errorMessage && <p className="text-sm text-red-500">{errorMessage}</p>}
          </div>
        );

      case "email":
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={field.id}>
              {field.title}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            {field.description && (
              <p className="text-sm text-muted-foreground">{field.description}</p>
            )}
            <Input
              id={field.id}
              type="email"
              placeholder={field.placeholder || "email@exemplo.com"}
              {...register(field.id, {
                required: field.required ? "Este campo é obrigatório" : false,
                pattern: {
                  value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                  message: "Email inválido",
                },
              })}
            />
            {errorMessage && <p className="text-sm text-red-500">{errorMessage}</p>}
          </div>
        );

      case "phone_number":
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={field.id}>
              {field.title}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            {field.description && (
              <p className="text-sm text-muted-foreground">{field.description}</p>
            )}
            <Input
              id={field.id}
              type="tel"
              placeholder={field.placeholder || "(00) 00000-0000"}
              {...register(field.id, {
                required: field.required ? "Este campo é obrigatório" : false,
              })}
            />
            {errorMessage && <p className="text-sm text-red-500">{errorMessage}</p>}
          </div>
        );

      case "textarea":
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={field.id}>
              {field.title}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            {field.description && (
              <p className="text-sm text-muted-foreground">{field.description}</p>
            )}
            <Textarea
              id={field.id}
              placeholder={field.placeholder}
              rows={4}
              {...register(field.id, {
                required: field.required ? "Este campo é obrigatório" : false,
                maxLength: field.validation?.maxLength
                  ? { value: field.validation.maxLength, message: `Máximo ${field.validation.maxLength} caracteres` }
                  : undefined,
              })}
            />
            {errorMessage && <p className="text-sm text-red-500">{errorMessage}</p>}
          </div>
        );

      case "select":
        const selectedValue = watch(field.id);
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={field.id}>
              {field.title}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            {field.description && (
              <p className="text-sm text-muted-foreground">{field.description}</p>
            )}
            <Select
              value={selectedValue}
              onValueChange={(value) => setValue(field.id, value)}
            >
              <SelectTrigger>
                <SelectValue placeholder={field.placeholder || "Selecione uma opção"} />
              </SelectTrigger>
              <SelectContent>
                {field.options?.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <input
              type="hidden"
              {...register(field.id, {
                required: field.required ? "Este campo é obrigatório" : false,
              })}
            />
            {errorMessage && <p className="text-sm text-red-500">{errorMessage}</p>}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Card className="shadow-lg border-0">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2 mb-4">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <CardTitle className="text-xl">{meeting.title}</CardTitle>
            <CardDescription className="flex items-center gap-2 mt-1">
              <CalendarIcon className="h-4 w-4" />
              <span className="capitalize">{formattedDate}</span>
              <span>•</span>
              <Clock className="h-4 w-4" />
              <span>{selectedTime}</span>
            </CardDescription>
          </div>
        </div>
        <LogoAndHeader tenant={tenant} designConfig={designConfig} />
        <p className="text-center text-muted-foreground">Preencha suas informações</p>
      </CardHeader>
      <CardContent>
        <form onSubmit={onFormSubmit} className="space-y-4">
          {bookingFields.map(renderField)}

          <Button
            type="submit"
            className="w-full py-6 text-lg font-semibold mt-6"
            disabled={isSubmitting}
            style={{
              backgroundColor: "var(--booking-button, var(--booking-primary))",
              color: "var(--booking-button-text, #ffffff)",
            }}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Agendando...
              </>
            ) : (
              "Confirmar Agendamento"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function ConfirmationStep({
  meeting,
  tenant,
  designConfig,
  bookingResult,
}: StepProps & {
  bookingResult: NonNullable<ReturnType<typeof usePublicBooking>["bookingResult"]>;
}) {
  const { booking, confirmationPage, calendarLinks } = bookingResult;

  const formattedDate = format(parseISO(booking.scheduledDate), "EEEE, d 'de' MMMM 'de' yyyy", {
    locale: ptBR,
  });

  const confirmationDesign = confirmationPage?.designConfig || designConfig;
  const title = confirmationPage?.title || "Reunião Agendada!";
  const subtitle = confirmationPage?.subtitle || `Sua reunião "${meeting.title}" foi confirmada.`;
  const message = confirmationPage?.confirmationMessage || 
    "Você receberá um email de confirmação com os detalhes da reunião.";

  return (
    <Card className="shadow-lg border-0">
      <CardHeader className="text-center pb-2">
        <LogoAndHeader tenant={tenant} designConfig={confirmationDesign} />
        <div className="flex justify-center mb-4">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center"
            style={{ backgroundColor: "var(--booking-primary, #3b82f6)" }}
          >
            <Check className="h-8 w-8 text-white" />
          </div>
        </div>
        <CardTitle className="text-2xl font-bold">{title}</CardTitle>
        <CardDescription className="text-base mt-2">{subtitle}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="bg-muted/50 rounded-lg p-4 space-y-3">
          <div className="flex items-center gap-3">
            <CalendarIcon className="h-5 w-5 text-muted-foreground" />
            <span className="capitalize">{formattedDate}</span>
          </div>
          <div className="flex items-center gap-3">
            <Clock className="h-5 w-5 text-muted-foreground" />
            <span>{booking.scheduledTime} ({meeting.duration} minutos)</span>
          </div>
          {booking.locationUrl && (
            <div className="flex items-center gap-3">
              <MapPin className="h-5 w-5 text-muted-foreground" />
              <a 
                href={booking.locationUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline flex items-center gap-1"
              >
                Link da reunião <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          )}
        </div>

        <p className="text-center text-muted-foreground">{message}</p>

        {(confirmationPage?.showAddToCalendar !== false) && calendarLinks && (
          <div className="space-y-3">
            <p className="text-sm font-medium text-center">Adicionar ao calendário:</p>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => window.open(calendarLinks.google, "_blank")}
              >
                <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M19.5 4H18V2h-2v2H8V2H6v2H4.5A1.5 1.5 0 003 5.5v14A1.5 1.5 0 004.5 21h15a1.5 1.5 0 001.5-1.5v-14A1.5 1.5 0 0019.5 4zM12 18a4 4 0 110-8 4 4 0 010 8z"
                  />
                </svg>
                Google Calendar
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => window.open(calendarLinks.outlook, "_blank")}
              >
                <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M21 3H3a2 2 0 00-2 2v14a2 2 0 002 2h18a2 2 0 002-2V5a2 2 0 00-2-2zm-9 14a5 5 0 110-10 5 5 0 010 10z"
                  />
                </svg>
                Outlook
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  const link = document.createElement("a");
                  link.href = calendarLinks.ics;
                  link.download = `reuniao-${booking.id}.ics`;
                  link.click();
                }}
              >
                <Download className="h-4 w-4 mr-2" />
                Baixar .ICS
              </Button>
            </div>
          </div>
        )}

        {confirmationPage?.ctaText && confirmationPage?.ctaUrl && (
          <Button
            className="w-full"
            style={{
              backgroundColor: "var(--booking-button, var(--booking-primary))",
              color: "var(--booking-button-text, #ffffff)",
            }}
            onClick={() => window.open(confirmationPage.ctaUrl!, "_blank")}
          >
            {confirmationPage.ctaText}
          </Button>
        )}

        {confirmationPage?.customContent && (
          <div 
            className="prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: confirmationPage.customContent }}
          />
        )}
      </CardContent>
    </Card>
  );
}
