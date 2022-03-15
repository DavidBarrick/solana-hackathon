import { Box, Stack, Text, useToast, useColorModeValue } from '@chakra-ui/react';
import { useState, createRef } from 'react';
import { Logo } from '../Logo';
import { SignInForm } from './SignInForm';
import { OnboardingForm } from './OnboardingForm';
import { VerificationCodeForm } from './VerificationCodeForm';
import { Card } from './Card';
import { Auth } from 'aws-amplify';
import { Redirect, Route, Switch, useHistory } from 'react-router-dom';
import actions from '../actions';
import { AUTH_STATES } from '../config';
import { analytics, showErrorToast } from '../utils';

const SignIn = ({ fetchProfile, authState }) => {
  const fieldRef = createRef();
  const lastNameFieldRef = createRef();
  const firstNameFieldRef = createRef();
  const subscribeRef = createRef();

  const toast = useToast();
  const history = useHistory();
  const [authenticatingUser, setAuthenticatingUser] = useState(null);
  const [loading, setLoading] = useState(false);

  const onSignUp = async passedEmail => {
    setLoading(true);
    try {
      if ((!fieldRef || !fieldRef.current) && !passedEmail) {
        throw Error('Email required');
      }

      const email = passedEmail || fieldRef.current.value;
      const params = {
        username: email,
        password: getRandomString(30),
      };
      await Auth.signUp(params);
      analytics.t('auth: created account');

      history.push({
        pathname: '/auth/code',
        search: window.location.search,
      });
      const res = await Auth.signIn(email);
      setAuthenticatingUser(res);
    } catch (err) {
      analytics.t('auth: error signing up', { message: err.message });
      showErrorToast(toast, err.message);
    }
    setLoading(false);
  };

  const onOnboardingUpdate = async () => {
    setLoading(true);
    try {
      if (!firstNameFieldRef || !firstNameFieldRef.current || !firstNameFieldRef.current.value) {
        throw Error('First name required');
      } else if (
        !lastNameFieldRef ||
        !lastNameFieldRef.current ||
        !lastNameFieldRef.current.value
      ) {
        throw Error('Last name required');
      }

      const first_name = firstNameFieldRef.current.value;
      const last_name = lastNameFieldRef.current.value;
      const opt_in = subscribeRef.current.checked;

      const params = {
        action: 'onboarding',
        data: {
          first_name,
          last_name,
          opt_in,
        },
      };

      await actions.updateProfile(params);
      analytics.t('auth: finished onboarding');

      if (fetchProfile) {
        await fetchProfile();
      }
    } catch (err) {
      analytics.t('auth: error submitting onboarding', { message: err.message });
      showErrorToast(toast, err.message);
    }
    setLoading(false);
  };

  const getRandomString = bytes => {
    const randomValues = new Uint8Array(bytes);
    window.crypto.getRandomValues(randomValues);
    return Array.from(randomValues).map(intToHex).join('');
  };

  const intToHex = nr => {
    return nr.toString(16).padStart(2, '0');
  };

  const onSignIn = async () => {
    setLoading(true);
    let email;
    try {
      if (!fieldRef || !fieldRef.current || !fieldRef.current.value) {
        throw Error('Email required');
      }

      email = fieldRef.current.value;
      const res = await Auth.signIn(email);
      history.push({ pathname: '/auth/code', search: window.location.search });

      setAuthenticatingUser(res);
    } catch (err) {
      if (err.code === 'UserLambdaValidationException') {
        await onSignUp(email);
      } else {
        analytics.t('auth: error on sign in', { message: err.message });
        showErrorToast(toast, err.message);
      }
    }
    setLoading(false);
  };

  const onVerificationCode = async () => {
    setLoading(true);
    try {
      if (!fieldRef || !fieldRef.current || !fieldRef.current.value) {
        throw Error('Verification code required');
      }

      await Auth.sendCustomChallengeAnswer(authenticatingUser, fieldRef.current.value);
    } catch (err) {
      analytics.t('auth: error on submitting verification code', { message: err.message });
      showErrorToast(toast, err.message);
    }
    setLoading(false);
  };

  return (
    <Box
      as="section"
      bgGradient={{
        md: 'linear(to-r, blue.400, teal.400)',
      }}
      py="20"
      h="100vh"
    >
      <Card maxW="2xl" mx="auto" textAlign="center">
        <Stack maxW="sm" mx="auto" spacing="8">
          <Logo fontSize="2xl" />
          <Stack spacing="3">
            <Text fontSize="3xl" fontWeight="bold" letterSpacing="tight">
              where devs learn by building
            </Text>
          </Stack>
          {authState === AUTH_STATES.NEEDS_AUTH && (
            <Switch>
              <Route path="/auth/email">
                <SignInForm fieldRef={fieldRef} loading={loading} onSubmit={onSignIn} />
              </Route>
              <Route path="/auth/code">
                <VerificationCodeForm
                  fieldRef={fieldRef}
                  loading={loading}
                  onSubmit={onVerificationCode}
                />
              </Route>
              <Redirect to="/auth/email" />
            </Switch>
          )}

          {authState === AUTH_STATES.ONBOARDING && (
            <Switch>
              <Route exact path="/auth/onboarding">
                <OnboardingForm
                  firstNameFieldRef={firstNameFieldRef}
                  lastNameFieldRef={lastNameFieldRef}
                  subscribeRef={subscribeRef}
                  loading={loading}
                  onSubmit={onOnboardingUpdate}
                />
              </Route>
              <Redirect to="/auth/onboarding" />
            </Switch>
          )}
        </Stack>
        <Text
          mt="16"
          fontSize="xs"
          mx="auto"
          maxW="md"
          color={useColorModeValue('gray.600', 'gray.400')}
        >
          by continuing, you acknowledge that you have read, understood, and agree to our{' '}
          <a
            href="https://zipschool.webflow.io/terms-of-service"
            target="_blank"
            rel="noopener noreferrer"
            style={{ textDecoration: 'underline' }}
          >
            terms of service
          </a>{' '}
          and{' '}
          <a
            href="https://zipschool.webflow.io/privacy-policy"
            target="_blank"
            rel="noopener noreferrer"
            style={{ textDecoration: 'underline' }}
          >
            privacy policy
          </a>
        </Text>
      </Card>
    </Box>
  );
};

export default SignIn;
