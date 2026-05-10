/**
 * gentle onboarding flow for first-time users
 * designed to be skippable, calming, and memory-friendly
 * guides users through essential setup without overwhelming them
 */

import React, { useState, useEffect, useCallback } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
// Progress component - simple inline implementation
const Progress = ({ value, className }: { value: number; className?: string }) => (
  <div className={cn("w-full bg-muted rounded-full h-2", className)}>
    <div
      className="bg-primary h-2 rounded-full transition-all duration-500"
      style={{ width: `${value}%` }}
    />
  </div>
)
import { cn } from '@/lib/utils'
import {
  Check,
  ArrowRight,
  ArrowLeft,
  X, // Using X instead of Skip
  Sparkles,
  Database,
  Wifi,
  GitBranch,
  Users,
  Palette,
  Shield
} from 'lucide-react'
import { zeroMaintenance } from '@/services/zero-maintenance.service'
import { robustSync } from '@/services/robust-sync.service'
import { autoGitSync } from '@/services/auto-git-sync.service'
import { nocobaseValidationService } from '@/services/nocobase-validation.service'

interface OnboardingStep {
  id: string
  title: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  action?: {
    label: string
    handler: () => Promise<boolean>
    skipable?: boolean
  }
  tips: string[]
}

interface OnboardingProps {
  onComplete: () => void
  onSkip: () => void
  className?: string
}

export function GentleOnboarding({ onComplete, onSkip, className }: OnboardingProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [isCompleted, setIsCompleted] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [stepProgress, setStepProgress] = useState<Record<string, boolean>>({})
  const [showTips, setShowTips] = useState(true)

  const onboardingSteps: OnboardingStep[] = [
    {
      id: 'welcome',
      title: 'welcome to your pkm',
      description: 'your personal knowledge management system is ready to help you organize thoughts and never lose ideas.',
      icon: Sparkles,
      tips: [
        'this setup is completely optional - you can skip anytime',
        'all features work automatically, no maintenance needed',
        'your data is always private and stored locally'
      ]
    },
    {
      id: 'auto-save',
      title: 'automatic saving',
      description: 'your work is saved automatically every 30 seconds. you never have to worry about losing your thoughts.',
      icon: Shield,
      action: {
        label: 'enable auto-save',
        handler: async () => {
          try {
            await zeroMaintenance.initialize()
            return true
          } catch (error) {
            console.error('Failed to initialize auto-save:', error)
            return false
          }
        },
        skipable: true
      },
      tips: [
        'saves happen quietly in the background',
        'you can also save manually with ctrl+s',
        'previous versions are kept for recovery'
      ]
    },
    {
      id: 'sync',
      title: 'cloud sync setup',
      description: 'connect to sync your knowledge across devices. works even when offline and resumes automatically.',
      icon: Wifi,
      action: {
        label: 'test connection',
        handler: async () => {
          try {
            const status = robustSync.getSyncStatus()
            return status.connected
          } catch (error) {
            console.error('Sync test failed:', error)
            return false
          }
        },
        skipable: true
      },
      tips: [
        'sync works in the background automatically',
        'changes are queued when offline',
        'conflicts are resolved automatically'
      ]
    },
    {
      id: 'git-backup',
      title: 'git backup',
      description: 'automatic git backups keep your knowledge safe and versioned. never worry about data loss again.',
      icon: GitBranch,
      action: {
        label: 'enable git backup',
        handler: async () => {
          try {
            autoGitSync.start()
            return true
          } catch (error) {
            console.error('Failed to start git backup:', error)
            return false
          }
        },
        skipable: true
      },
      tips: [
        'backups happen every 15 minutes automatically',
        'you can restore any previous version',
        'works even without internet connection'
      ]
    },
    {
      id: 'database',
      title: 'database connection',
      description: 'connect to your external database for enhanced search and organization features.',
      icon: Database,
      action: {
        label: 'test database',
        handler: async () => {
          try {
            await nocobaseValidationService.testConnection()
            return true
          } catch (error) {
            console.error('Database test failed:', error)
            return false
          }
        },
        skipable: true
      },
      tips: [
        'optional - works without database too',
        'enables powerful search and filtering',
        'your data stays under your control'
      ]
    },
    {
      id: 'personalization',
      title: 'make it yours',
      description: 'your pkm adapts to you. colors, fonts, and layout can be personalized to your preference.',
      icon: Palette,
      tips: [
        'try the headmates feature for identity tracking',
        'explore the canvas for visual thinking',
        'everything is customizable to your needs'
      ]
    },
    {
      id: 'ready',
      title: 'you\'re all set!',
      description: 'your pkm is ready to use. everything works automatically - just focus on your thoughts.',
      icon: Check,
      tips: [
        'remember: everything saves automatically',
        'use ctrl+/ for quick actions',
        'enjoy your calm, reliable thought space'
      ]
    }
  ]

  const currentStepData = onboardingSteps[currentStep]
  const progress = ((currentStep + 1) / onboardingSteps.length) * 100

  const handleNext = useCallback(async () => {
    const step = onboardingSteps[currentStep]

    if (step.action && !stepProgress[step.id]) {
      setIsProcessing(true)

      try {
        const success = await step.action.handler()
        setStepProgress(prev => ({ ...prev, [step.id]: success }))

        if (success) {
          setTimeout(() => {
            setCurrentStep(prev => prev + 1)
            setIsProcessing(false)
          }, 800)
        } else {
          setIsProcessing(false)
        }
      } catch (error) {
        console.error('Step action failed:', error)
        setIsProcessing(false)
      }
    } else {
      if (currentStep < onboardingSteps.length - 1) {
        setCurrentStep(prev => prev + 1)
      } else {
        setIsCompleted(true)
        setTimeout(() => onComplete(), 1000)
      }
    }
  }, [currentStep, onboardingSteps, stepProgress, onComplete])

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1)
    }
  }

  const handleSkip = () => {
    setIsCompleted(true)
    setTimeout(() => onSkip(), 500)
  }

  const handleStepAction = async () => {
    if (!currentStepData.action) return

    setIsProcessing(true)

    try {
      const success = await currentStepData.action.handler()
      setStepProgress(prev => ({ ...prev, [currentStepData.id]: success }))
    } catch (error) {
      console.error('Action failed:', error)
    } finally {
      setIsProcessing(false)
    }
  }

  // Auto-advance completed steps
  useEffect(() => {
    if (stepProgress[currentStepData.id] && currentStep < onboardingSteps.length - 1) {
      const timer = setTimeout(() => {
        setCurrentStep(prev => prev + 1)
      }, 1500)
      return () => clearTimeout(timer)
    }
  }, [stepProgress, currentStepData.id, currentStep, onboardingSteps.length])

  if (isCompleted) {
    return (
      <div className={cn("fixed inset-0 bg-background/95 backdrop-blur-sm flex items-center justify-center z-50 p-4", className)}>
        <Card className="max-w-md w-full p-8 text-center">
          <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-2xl font-bold mb-2">ready to go!</h2>
          <p className="text-muted-foreground mb-6">
            your pkm is set up and ready to help you organize your thoughts.
          </p>
          <div className="w-full bg-primary/20 rounded-full h-2 mb-6">
            <div className="bg-primary h-2 rounded-full transition-all duration-1000" style={{ width: '100%' }} />
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className={cn("fixed inset-0 bg-background/95 backdrop-blur-sm flex items-center justify-center z-50 p-4", className)}>
      <Card className="max-w-2xl w-full p-8">
        {/* Progress bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
            <span>setup progress</span>
            <span>{currentStep + 1} of {onboardingSteps.length}</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Step content */}
        <div className="space-y-6">
          {/* Icon and title */}
          <div className="flex items-start space-x-4">
            <div className={cn(
              "w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0",
              stepProgress[currentStepData.id]
                ? "bg-primary/20 text-primary"
                : "bg-muted text-muted-foreground"
            )}>
              <currentStepData.icon className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold mb-2">{currentStepData.title}</h2>
              <p className="text-muted-foreground leading-relaxed">
                {currentStepData.description}
              </p>
            </div>
          </div>

          {/* Action button */}
          {currentStepData.action && (
            <div className="flex flex-col space-y-2">
              <Button
                onClick={handleStepAction}
                disabled={isProcessing || stepProgress[currentStepData.id]}
                className={cn(
                  "w-full",
                  stepProgress[currentStepData.id] && "bg-green-600 hover:bg-green-700"
                )}
              >
                {isProcessing ? (
                  "working..."
                ) : stepProgress[currentStepData.id] ? (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    completed
                  </>
                ) : (
                  currentStepData.action.label
                )}
              </Button>

              {currentStepData.action.skipable && !stepProgress[currentStepData.id] && (
                <Button
                  variant="ghost"
                  onClick={() => setStepProgress(prev => ({ ...prev, [currentStepData.id]: true }))}
                  className="w-full"
                >
                  skip this step
                </Button>
              )}
            </div>
          )}

          {/* Tips */}
          {showTips && currentStepData.tips.length > 0 && (
            <div className="bg-muted/50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-muted-foreground">helpful tips</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowTips(false)}
                  className="h-6 w-6 p-0"
                >
                  ×
                </Button>
              </div>
              <ul className="space-y-1 text-sm text-muted-foreground">
                {currentStepData.tips.map((tip, index) => (
                  <li key={index} className="flex items-start">
                    <span className="text-primary mr-2">•</span>
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-8 pt-6 border-t">
          <div className="flex items-center space-x-2">
            {currentStep > 0 && (
              <Button
                variant="outline"
                onClick={handlePrevious}
                className="gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                back
              </Button>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              onClick={handleSkip}
              className="gap-2"
            >
              <Skip className="w-4 h-4" />
              skip setup
            </Button>

            <Button
              onClick={handleNext}
              disabled={isProcessing}
              className="gap-2"
            >
              {currentStep === onboardingSteps.length - 1 ? (
                <>
                  finish
                  <Check className="w-4 h-4" />
                </>
              ) : (
                <>
                  next
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}

// Hook to check if onboarding should be shown
export function useOnboarding() {
  const [shouldShow, setShouldShow] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const checkOnboardingStatus = async () => {
      try {
        const hasCompletedOnboarding = localStorage.getItem('pkm-onboarding-completed')
        const hasSkippedOnboarding = localStorage.getItem('pkm-onboarding-skipped')

        if (!hasCompletedOnboarding && !hasSkippedOnboarding) {
          setShouldShow(true)
        }
      } catch (error) {
        console.error('Failed to check onboarding status:', error)
      } finally {
        setIsLoading(false)
      }
    }

    checkOnboardingStatus()
  }, [])

  const completeOnboarding = () => {
    localStorage.setItem('pkm-onboarding-completed', Date.now().toString())
    setShouldShow(false)
  }

  const skipOnboarding = () => {
    localStorage.setItem('pkm-onboarding-skipped', Date.now().toString())
    setShouldShow(false)
  }

  const resetOnboarding = () => {
    localStorage.removeItem('pkm-onboarding-completed')
    localStorage.removeItem('pkm-onboarding-skipped')
    setShouldShow(true)
  }

  return {
    shouldShow,
    isLoading,
    completeOnboarding,
    skipOnboarding,
    resetOnboarding
  }
}